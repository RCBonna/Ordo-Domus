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
import { Package, Loader2, Plus, History, MapPin, Calendar, Tag, Layers, Archive, RefreshCw, PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

// Função para padronizar o texto: "fURADEIRA" -> "Furadeira"
const formatarTexto = (texto?: string | null) => {
  if (!texto) return '';
  const limpo = texto.trim();
  if (limpo.length === 0) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

export default function OrdoDomus() {
  const [input, setInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractedItem | null>(null);
  const [history, setHistory] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mergeStatus, setMergeStatus] = useState<{ action: 'MERGE' | 'ADD', message: string } | null>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeAtiva, setUnidadeAtiva] = useState<any>(null);

  // Função para buscar as unidades do usuário
  const carregarUnidades = async (userId: string) => {
    const { data, error } = await supabase
      .from('membros_unidade')
      .select('unidade_id, unidades(id, nome)')
      .eq('user_id', userId);

    if (!error && data) {
      const lista = data.map(item => item.unidades);
      setUnidades(lista);
      if (lista.length > 0) setUnidadeAtiva(lista[0]); // Define a primeira como padrão
    }
  };
  // Efeito para carregar as unidades assim que o usuário estiver logado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        carregarUnidades(session.user.id);
      }
    };
    checkUser();
  }, []);

  const handleExtract = async () => {
    if (!input.trim()) return;
    
    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);

    try {
      // 1. Extrai os dados com o Gemini (A Inteligência)
      const data = await extractInventoryData(input);
      setCurrentResult(data);

      // 2. Verifica se existe uma sessão ativa (Login)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa fazer login no topo da página antes de salvar itens.");
      }

      // 3. Descobre o 'unidade_id' vinculado ao usuário logado
      const { data: membro, error: erroMembro } = await supabase
        .from('membros_unidade')
        .select('unidade_id')
        .eq('user_id', session.user.id)
        .single();

      if (erroMembro || !membro) {
        throw new Error("Sua conta não está vinculada a uma Unidade. Verifique o banco de dados.");
      }

      // 4. Salva DEFINITIVAMENTE no Supabase com os textos formatados
      const { data: itemSalvo, error: erroInsert } = await supabase
        .from('itens_inventario')
        .insert({
          //unidade_id: membro.unidade_id,
          unidade_id: unidadeAtiva.id,
          nome: formatarTexto(data.item) || 'Item sem nome',
          categoria: data.categoria, // Categorias geralmente deixamos como a IA mandou ou padronizamos depois
          comodo: formatarTexto(data.comodo) || 'Não informado',
          armario: formatarTexto(data.armario) || 'Não informado',
          caixa: formatarTexto(data.caixa) || 'Não informado',
          quantidade: Number(data.quantidade) || 1
        })
        .select() 
        .single();

      if (erroInsert) {
        console.error("Erro do Supabase:", erroInsert);
        throw new Error("Falha ao gravar no banco de dados.");
      }

      // 5. Atualiza a interface mapeando o retorno do banco para o padrão da tela
      const novoItemNaTela: ExtractedItem = {
        item: itemSalvo.nome,
        categoria: itemSalvo.categoria,
        comodo: itemSalvo.comodo,
        armario: itemSalvo.armario,
        caixa: itemSalvo.caixa,
        validade: '',
        quantidade: itemSalvo.quantidade.toString()
      };

      setHistory(prev => [novoItemNaTela, ...prev]);
      setMergeStatus({ action: 'ADD', message: 'Item gravado com sucesso no Supabase!' });
      
      setInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao processar a extração.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
  };

  return (
    <> {/* Fragmento que envolve tudo para evitar o erro de sintaxe */}
      <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-8">
        
        {/* Componente de Login no Topo */}
        <div className="max-w-5xl mx-auto mb-8">
          <Auth />
        </div>

        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex items-center gap-3 pb-6 border-b border-gray-200">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Ordo Domus - Casa Organizada</h1>
              <p className="text-muted-foreground text-sm">Extraia dados estruturados de frases bagunçadas.</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                
                {unidades.length > 1 ? (
                  // SELETOR PARA MULTI-TENANT
                  <select 
                    value={unidadeAtiva?.id} 
                    onChange={(e) => setUnidadeAtiva(unidades.find(u => u.id === e.target.value))}
                    className="bg-transparent font-medium text-sm border-none focus:ring-0 cursor-pointer"
                  >
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                ) : (
                  // APENAS EXIBIÇÃO PARA SINGLE-TENANT
                  <span className="font-medium text-sm">
                    {unidadeAtiva?.nome || 'Carregando...'}
                  </span>
                )}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
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
                      placeholder="Ex: Coloquei 3 caixas de leite que vencem em dezembro de 2025 na cozinha, armário azul, ..."
                      className="min-h-[120px] resize-none rounded-xl bg-gray-50/50 border-gray-200 focus-visible:ring-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
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
                    disabled={isExtracting || !input.trim()}
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

              {currentResult && (
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
                      <p>Nenhum item extraído ainda.</p>
                      <p className="text-sm mt-1 opacity-70">Os itens processados aparecerão aqui.</p>
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
    </>
  );
}