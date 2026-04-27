// Blindagem geral: Todo o código foi escrito com a premissa de que a interface pode ser burlada, ou seja, que dados inesperados podem chegar até as funções. Por isso, há validações e tratamentos de erro em pontos críticos para evitar que o sistema quebre ou fique travado.
import Auth from './components/Auth';
import GuestView from './components/GuestView';
import AdminPanel from './components/AdminPanel';
import Onboarding from './components/Onboarding';
import { useState, useEffect, useRef } from 'react';
import { extractInventoryData, mergeInventoryItem, type ExtractedItem } from './services/geminiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Loader2, Plus, History, MapPin, Calendar, Tag, Layers, Archive, RefreshCw, PlusCircle, Trash2, LogOut, Mic, MicOff } from 'lucide-react';
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
  
  const regex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const match = dataRaw.trim().match(regex);
  
  if (!match) return dataRaw;

  let dia = parseInt(match[1], 10);
  let mes = parseInt(match[2], 10);
  let ano = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  if (mes > 12) {
      if (dia <= 12) {
          let temp = dia; dia = mes; mes = temp;
      } else {
          return '';
      }
  }
  
  if (dia > 31 || dia < 1) return '';
  if (ano < 100) ano += 2000;

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
    papel: string;
    status: string;
  }
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeAtiva, setUnidadeAtiva] = useState<Unidade | null>(null);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const carregarUnidades = async (userId: string) => {
    console.log("[OrdoDomus] carregarUnidades chamado para userId:", userId);
    const { data, error } = await supabase
      .from('membros_unidade')
      .select(`
        papel,
        status,
        unidade_id,
        unidades (
          id,
          nome
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("[OrdoDomus] Erro RLS ao carregar unidades:", error);
      return;
    }

    console.log("[OrdoDomus] Dados retornados de membros_unidade:", JSON.stringify(data));

    if (data) {
      const rawLista = data.map(item => {
        if (!item.unidades) return null;
        const casa = Array.isArray(item.unidades) ? item.unidades[0] : item.unidades;
        // @ts-ignore
        return { id: casa.id, nome: casa.nome, papel: item.papel, status: item.status };
      }).filter(Boolean);
      const lista = rawLista as any as Unidade[];
      console.log("[OrdoDomus] Lista de unidades processada:", JSON.stringify(lista));
      setUnidades(lista);
      
      if (lista.length === 1) {
        setUnidadeAtiva(lista[0]); // Seleciona a única encontrada
      } else {
        setUnidadeAtiva(null); // Força a tela de seleção se houver > 1
      }
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const toggleRecording = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       setError("Seu navegador não suporta gravação de áudio.");
       return;
    }
    
    // Se já está gravando, PARA a instância armazenada no ref
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return; 
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript;
            setInput(prev => prev ? prev + " " + transcript : transcript);
        };
        recognition.onerror = (event: any) => {
            console.error("[Mic]", event.error);
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };
        
        recognitionRef.current = recognition;
        recognition.start();
    } catch(e) {
        setIsRecording(false);
        recognitionRef.current = null;
    }
  };

  // --- LOGOUT: Limpa estado React, chama API, e recarrega ---
  const handleLogout = async () => {
    console.log("[OrdoDomus] Logout...");
    setCurrentUserEmail(null);
    setCurrentUserId(null);
    setUnidades([]);
    setUnidadeAtiva(null);
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
    setError(null);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error("[OrdoDomus] Erro no signOut:", e);
    }
    // Reload garante limpeza total do cache e estado
    window.location.reload();
  };

  // --- AUTH EFFECT 1: Detecta sessão (SEM await pesado no callback) ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[OrdoDomus] Auth event:", event, "session?", !!session);

      if (session?.user) {
        setCurrentUserEmail(session.user.email || null);
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserEmail(null);
        setCurrentUserId(null);
        setUnidades([]);
        setUnidadeAtiva(null);
        setHistory([]);
      }
      setIsAuthLoading(false);
    });

    // Fallback se Supabase travar
    const timeoutId = setTimeout(() => setIsAuthLoading(false), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // --- AUTH EFFECT 2: Quando userId mudar, carrega as unidades (com retry) ---
  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const carregar = async (tentativa: number) => {
      if (cancelled) return;
      console.log(`[OrdoDomus] Carregando unidades (tentativa ${tentativa})...`);
      
      try {
        const { data, error: queryError } = await supabase
          .from('membros_unidade')
          .select(`
            papel,
            status,
            unidade_id,
            unidades (
              id,
              nome
            )
          `)
          .eq('user_id', currentUserId);

        if (cancelled) return;

        if (queryError) {
          console.error("[OrdoDomus] Erro RLS:", queryError);
          // Retry se for erro de auth/permissão
          if (tentativa < 3) {
            setTimeout(() => carregar(tentativa + 1), 1000);
          }
          return;
        }

        console.log("[OrdoDomus] Dados retornados:", JSON.stringify(data));

        const rawLista = (data || []).map(item => {
          if (!item.unidades) return null;
          const casa = Array.isArray(item.unidades) ? item.unidades[0] : item.unidades;
          // @ts-ignore
          return { id: casa.id, nome: casa.nome, papel: item.papel, status: item.status };
        }).filter(Boolean) as Unidade[];

        console.log("[OrdoDomus] Lista processada:", JSON.stringify(rawLista));

        if (rawLista.length === 0 && tentativa < 3) {
          // Pode ser timing do token JWT — retry
          console.log("[OrdoDomus] Lista vazia, retentando em 1.5s...");
          setTimeout(() => carregar(tentativa + 1), 1500);
          return;
        }

        setUnidades(rawLista);
        if (rawLista.length === 1) {
          setUnidadeAtiva(rawLista[0]);
        } else if (rawLista.length > 1) {
          setUnidadeAtiva(null);
        }
      } catch (e) {
        console.error("[OrdoDomus] EXCEPTION:", e);
        if (tentativa < 3) {
          setTimeout(() => carregar(tentativa + 1), 1500);
        }
      }
    };

    // Delay inicial de 300ms para dar tempo ao token JWT
    const timerId = setTimeout(() => carregar(1), 300);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [currentUserId]);

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
                ) : currentUserEmail ? ( 
                  unidades.length > 0 ? (
                    unidades.length > 1 && unidadeAtiva ? (
                      <select 
                        value={unidadeAtiva.id} 
                        onChange={(e) => setUnidadeAtiva(unidades.find(u => u.id === e.target.value))}
                        className="bg-transparent font-medium text-sm border-none focus:ring-0 cursor-pointer p-0 h-auto"
                      >
                        {unidades.map(u => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    ) : unidadeAtiva ? (
                      <span className="font-medium text-sm">{unidadeAtiva.nome}</span>
                    ) : (
                      <span className="font-medium text-sm text-blue-600">Selecione uma unidade abaixo</span>
                    )
                  ) : (
                    <span className="font-medium text-sm text-orange-500">Nenhuma unidade vinculada</span>
                  )
                ) : (
                  <span className="text-sm text-destructive font-medium">Aguardando login</span>
                )}
              </div>
            </div>
          </div>

          {/* BOTÃO DE SAIR ALINHADO NO HEADER */}
          {currentUserEmail && !isAuthLoading && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {currentUserEmail}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          )}
        </header>

        {/* MÓDULO DE LOGIN CENTRALIZADO (Se não estiver logado) */}
        {!currentUserEmail && !isAuthLoading && (
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
        <div className={`transition-opacity duration-300 ${!currentUserEmail ? 'opacity-40 pointer-events-none hidden' : 'opacity-100'} mt-4`}>
          {currentUserEmail && !unidadeAtiva && unidades.length > 1 ? (
             <div className="text-center p-12 bg-white rounded-[24px] shadow-sm max-w-lg mx-auto border border-gray-100 mt-12">
                <div className="w-16 h-16 bg-blue-50/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Selecione uma Unidade</h2>
                <p className="text-muted-foreground mt-2 mb-6">Você faz parte de mais de uma unidade. Qual você deseja acessar agora?</p>
                <div className="space-y-3">
                  {unidades.map(u => (
                     <Button key={u.id} variant="outline" className="w-full justify-start h-12 text-base" onClick={() => setUnidadeAtiva(u)}>
                       {u.nome} <span className="ml-auto text-xs text-muted-foreground uppercase">{u.papel}</span>
                     </Button>
                  ))}
                </div>
             </div>
          ) : currentUserEmail && !unidadeAtiva && unidades.length === 0 ? (
             <Onboarding onSuccess={async () => {
               const { data: { session } } = await supabase.auth.getSession();
               if (session?.user) await carregarUnidades(session.user.id);
             }} />
          ) : isSistemaLiberado && unidadeAtiva?.status === 'pendente' ? (
             <div className="text-center p-12 bg-white rounded-[24px] shadow-sm max-w-lg mx-auto border border-gray-100 mt-12">
                <div className="w-16 h-16 bg-orange-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Aguardando Aprovação</h2>
                <p className="text-muted-foreground mt-2">Sua solicitação de acesso foi enviada. O administrador da unidade precisa aprovar você como convidado para que o inventário seja liberado.</p>
             </div>
          ) : isSistemaLiberado && unidadeAtiva?.papel === 'convidado' ? (
             <GuestView unidadeId={unidadeAtiva.id} />
          ) : (
            <>
               {isSistemaLiberado && unidadeAtiva?.papel !== 'convidado' && <AdminPanel unidadeId={unidadeAtiva.id} papel={unidadeAtiva.papel} />}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
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
                  <div className="flex justify-between items-end mb-2">
                    <Label htmlFor="inventory-input" className="sr-only">Frase</Label>
                    <Button 
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleRecording}
                      disabled={isExtracting || !isSistemaLiberado}
                      className={`gap-2 rounded-xl transition-all ${isRecording ? "animate-pulse" : ""}`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isRecording ? "Parar Gravação" : "Falar no Microfone"}
                    </Button>
                  </div>
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
                        <Layers className="w-3 h-3" /> Móvel / Eletro
                      </p>
                      <p className="font-medium text-sm">{currentResult.armario || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Divisão / Caixa
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
            </>
          )}
        </div>

      </div>
    </div>
  );
}
