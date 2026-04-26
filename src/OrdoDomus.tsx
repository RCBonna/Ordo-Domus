// Blindagem geral: Todo o código foi escrito com a premissa de que a interface pode ser burlada, ou seja, que dados inesperados podem chegar até as funções. Por isso, há validações e tratamentos de erro em pontos críticos para evitar que o sistema quebre ou fique travado.
import Auth from './components/Auth'
import { useState, useEffect } from 'react';
import { extractInventoryData, mergeInventoryItem, type ExtractedItem } from './services/geminiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Loader2, Plus, History, MapPin, Calendar, Tag, Layers, Archive, RefreshCw, PlusCircle, Trash2, LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

// Blindagem 1: Garante que o formatarTexto não quebre se receber números ou dados nulos
const formatarTexto = (texto?: any) => {
  if (!texto || typeof texto !== 'string') return '';
  const limpo = texto.trim();
  if (limpo.length === 0) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

// Blindagem de Datas: Aceita DD/MM/YY, DD/MM, corrige meses inválidos e insere o ano atual
const formatarData = (dataRaw?: string | null) => {
  if (!dataRaw || dataRaw.trim() === '-' || dataRaw.trim() === '') return '';
  
  // Extrai apenas os números (ex: "20/06/26" -> [20, 06, 26])
  const regex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const match = dataRaw.trim().match(regex);
  
  if (!match) return dataRaw; // Se a IA devolver "Amanhã", deixa passar

  let dia = parseInt(match[1], 10);
  let mes = parseInt(match[2], 10);
  let ano = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  // Tratamento para usuários que invertem dia e mês ou digitam 20/20/2026
  if (mes > 12) {
      if (dia <= 12) {
          // É provável que tenha digitado no formato americano MM/DD
          let temp = dia; dia = mes; mes = temp;
      } else {
          return ''; // Data absurda (ex: 25/15/2026) - melhor anular
      }
  }
  
  if (dia > 31 || dia < 1) return '';
  if (ano < 100) ano += 2000; // Converte '26' para '2026'

  return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
};

export default function OrdoDomus() {
  const [input, setInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractedItem | null>(null);
  const [history, setHistory] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mergeStatus, setMergeStatus] = useState<{ action: 'MERGE' | 'ADD', message: string } | null>(null);
  
  interface Unidade {
    id: string;
    nome: string;
  }
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeAtiva, setUnidadeAtiva] = useState<Unidade | null>(null);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const carregarUnidades = async (userId: string) => {
    const { data, error } = await supabase
      .from('membros_unidade')
      .select(`
        unidade_id,
        unidades (
          id,
          nome
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("Erro ao carregar unidades:", error);
      return;
    }

    if (data) {
      const rawLista = data.flatMap(item => item.unidades).filter(Boolean);
      const lista = rawLista as any as Unidade[];
      setUnidades(lista);
      if (lista.length > 0) {
        setUnidadeAtiva(lista[0]);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const inicializarSessao = async () => {
      try {
        setIsAuthLoading(true);
        // Blindagem 2: Tenta ler a sessão com tratamento de erro
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error; // Cai no catch e limpa o lixo do cache
        
        if (session?.user && isMounted) {
          await carregarUnidades(session.user.id);
        }
      } catch (err) {
        console.error("Cache de sessão corrompido. Forçando logout para limpar...", err);
        await supabase.auth.signOut();
      } finally {
        // Garante que a tela sempre vai destravar, dando erro ou não
        if (isMounted) setIsAuthLoading(false);
      }
    };

    inicializarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        await carregarUnidades(session.user.id);
        setIsAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUnidades([]);
        setUnidadeAtiva(null);
        setHistory([]);
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleExtract = async () => {
    if (!input.trim()) return;
    
    // Blindagem 3: Impede a execução se a interface foi burlada
    if (!unidadeAtiva) {
      setError("Unidade não identificada. Faça login para extrair dados.");
      return;
    }

    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);

    try {
      const data = await extractInventoryData(input);
      setCurrentResult(data);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
      }

      // NOVO PASSO 4/5: Verifica se há itens similares para fazer MERGE
      const { data: itensExistentes, error: erroBusca } = await supabase
        .from('itens_inventario')
        .select('*')
        .eq('unidade_id', unidadeAtiva.id)
        .order('created_at', { ascending: false })
        .limit(50);

      let acaoFinal: 'MERGE' | 'ADD' = 'ADD';
      let itemModificadoNaTela: ExtractedItem | null = null;
      let mensagem = '';

      if (!erroBusca && itensExistentes && itensExistentes.length > 0) {
        const listaParaIA = itensExistentes.map(dbItem => ({
            item: dbItem.nome,
            categoria: dbItem.categoria,
            comodo: dbItem.comodo,
            armario: dbItem.armario,
            caixa: dbItem.caixa,
            validade: dbItem.validade || '',
            quantidade: dbItem.quantidade
        }));

        try {
          const decisao = await mergeInventoryItem(data, listaParaIA);
          if (decisao.action === 'MERGE' && decisao.matchIndex !== undefined && decisao.mergedItem) {
             const idExistente = itensExistentes[decisao.matchIndex].id;
             
             // Faz um UPDATE no banco
             const { error: erroUpdate } = await supabase
                .from('itens_inventario')
                .update({ quantidade: Number(decisao.mergedItem.quantidade) })
                .eq('id', idExistente);

             if (erroUpdate) throw new Error("Falha ao atualizar a soma no banco.");
             
             acaoFinal = 'MERGE';
             mensagem = 'A quantidade foi somada a um item existente!';
             itemModificadoNaTela = { ...decisao.mergedItem, quantidade: Number(decisao.mergedItem.quantidade) };
          }
        } catch (e) {
          console.error("Falha silenciosa no motor de IA de merge, fallback para criação de novo", e);
        }
      }

      if (acaoFinal === 'ADD') {
        const { data: itemSalvo, error: erroInsert } = await supabase
          .from('itens_inventario')
          .insert({
            unidade_id: unidadeAtiva.id,
            nome: formatarTexto(data.item) || 'Item sem nome',
            categoria: data.categoria,
            comodo: formatarTexto(data.comodo) || 'Não informado',
            armario: formatarTexto(data.armario),
            caixa: formatarTexto(data.caixa),
            quantidade: Number(data.quantidade) || 1,
            validade: formatarData(data.validade) || null
          })
          .select() 
          .single();

        if (erroInsert) throw new Error("Falha ao gravar no banco de dados.");
        
        mensagem = 'Item gravado com sucesso no inventário!';
        itemModificadoNaTela = {
          item: itemSalvo.nome,
          categoria: itemSalvo.categoria,
          comodo: itemSalvo.comodo,
          armario: itemSalvo.armario,
          caixa: itemSalvo.caixa,
          validade: itemSalvo.validade || '',
          quantidade: Number(itemSalvo.quantidade)
        };
      }

      if (itemModificadoNaTela) {
         setHistory(prev => [itemModificadoNaTela!, ...prev]);
      }
      setMergeStatus({ action: acaoFinal, message: mensagem });
      setInput('');
} catch (err: any) {
      console.error(err);
      
      // Intercepta a falha do Gemini e traduz para o usuário
      if (err.message && err.message.includes('503')) {
         setError('O servidor de IA está com alta demanda. Respire fundo, aguarde 5 segundos e tente novamente.');
      } else {
         setError('Ocorreu um erro ao processar a frase. Verifique a conexão e tente novamente.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
  };

  // Variável para facilitar a leitura se o sistema está pronto para uso
  const isSistemaLiberado = !isAuthLoading && unidadeAtiva;

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-8">
      
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER UNIFICADO */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ordo Domus - Casa Organizada</h1>
              <p className="text-muted-foreground text-sm">Extraia dados estruturados de frases bagunçadas.</p>
              
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-primary" />
                {isAuthLoading ? (
                  <span className="text-sm text-muted-foreground animate-pulse">Validando acesso...</span>
                ) : unidadeAtiva && unidades.length > 0 ? ( 
                  unidades.length > 1 ? (
                    <select 
                      value={unidadeAtiva.id} 
                      onChange={(e) => setUnidadeAtiva(unidades.find(u => u.id === e.target.value))}
                      className="bg-transparent font-medium text-sm border-none focus:ring-0 cursor-pointer p-0 h-auto"
                    >
                      {unidades.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-sm">{unidadeAtiva.nome}</span>
                  )
                ) : (
                  <span className="text-sm text-destructive font-medium">Aguardando login</span>
                )}
              </div>
            </div>
          </div>

          {/* BOTÃO DE SAIR ALINHADO NO HEADER */}
          {isSistemaLiberado && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload(); // Limpa 100% da RAM e do Cache Visual
              }}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair do Sistema
            </Button>
          )}
        </header>

        {/* MÓDULO DE LOGIN CENTRALIZADO (Se não estiver logado) */}
        {!isSistemaLiberado && !isAuthLoading && (
          <Card className="border-none shadow-md rounded-[24px] max-w-md mx-auto my-12 bg-white">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Bem-vindo ao Ordo Domus</CardTitle>
              <CardDescription>Faça login para acessar seu inventário</CardDescription>
            </CardHeader>
            <CardContent>
              <Auth />
            </CardContent>
          </Card>
        )}

        {/* CORPO DO SISTEMA */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 transition-opacity duration-300 ${!isSistemaLiberado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Left Column: Input and Current Result */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none shadow-sm rounded-[24px]">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Nova Entrada</CardTitle>
                <CardDescription>
                  Descreva onde você guardou o item.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory-input" className="sr-only">Frase</Label>
                  <Textarea
                    id="inventory-input"
                    placeholder="Ex: Coloquei 3 caixas de leite na cozinha, armário azul..."
                    className="min-h-[120px] resize-none rounded-xl bg-gray-50/50 border-gray-200 focus-visible:ring-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isExtracting || !isSistemaLiberado}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleExtract();
                      }
                    }}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive font-medium">{error}</p>
                )}
                <Button 
                  className="w-full rounded-xl h-11" 
                  onClick={handleExtract} 
                  disabled={isExtracting || !input.trim() || !isSistemaLiberado}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Extrair Dados
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {currentResult && isSistemaLiberado && (
              <Card className="border-none shadow-sm rounded-[24px] overflow-hidden bg-white">
                <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex justify-between items-center">
                  <h3 className="font-medium text-primary flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Item Extraído
                  </h3>
                  <Badge variant="secondary" className="rounded-full font-medium">
                    {currentResult.categoria || 'Sem categoria'}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</p>
                      <p className="font-medium text-base">{currentResult.item || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantidade</p>
                      <p className="font-medium text-base">{currentResult.quantidade || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Cômodo
                      </p>
                      <p className="font-medium text-sm">{currentResult.comodo || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Armário
                      </p>
                      <p className="font-medium text-sm">{currentResult.armario || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Caixa
                      </p>
                      <p className="font-medium text-sm">{currentResult.caixa || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Validade
                      </p>
                      <p className="font-medium text-sm">{currentResult.validade || '-'}</p>
                    </div>
                  </div>
                  
                  {mergeStatus && (
                    <div className={`mt-6 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${mergeStatus.action === 'MERGE' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                      {mergeStatus.action === 'MERGE' ? <RefreshCw className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                      {mergeStatus.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm rounded-[24px] h-full flex flex-col">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  Histórico de Inventário
                </CardTitle>
                {history.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearHistory}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {history.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <Package className="w-12 h-12 mb-4 opacity-20" />
                    <p>Nenhum item processado nesta sessão.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] w-full rounded-b-[24px]">
                    <Table>
                      <TableHeader className="bg-gray-50/80 sticky top-0 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-gray-100">
                          <TableHead className="font-medium">Item</TableHead>
                          <TableHead className="font-medium">Localização</TableHead>
                          <TableHead className="font-medium">Qtd</TableHead>
                          <TableHead className="font-medium">Validade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item, index) => (
                          <TableRow key={index} className="border-gray-100">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{item.item || '-'}</span>
                                <span className="text-xs text-muted-foreground">{item.categoria}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                {item.comodo ? (
                                  <>
                                    <span>{item.comodo}</span>
                                    {([item.armario, item.caixa].filter(Boolean).length > 0) && (
                                      <span className="text-xs text-muted-foreground">
                                        {[item.armario, item.caixa].filter(Boolean).join(' • ')}
                                      </span>
                                    )}
                                  </>
                                ) : [item.armario, item.caixa].filter(Boolean).length > 0 ? (
                                  <span>{[item.armario, item.caixa].filter(Boolean).join(' • ')}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantidade || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.validade || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
