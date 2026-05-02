// Blindagem geral: Todo o código foi escrito com a premissa de que a interface pode ser burlada, ou seja, que dados inesperados podem chegar até as funções. Por isso, há validações e tratamentos de erro em pontos críticos para evitar que o sistema quebre ou fique travado.
import Auth from './components/Auth';
import GuestView from './components/GuestView';
import AdminPanel from './components/AdminPanel';
import Onboarding from './components/Onboarding';
import { useState, useEffect, useRef } from 'react';
import { extractInventoryData, type ExtractedItem } from './services/geminiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Loader2, Plus, History, MapPin, Calendar, Tag, Layers, Archive, RefreshCw, PlusCircle, Trash2, LogOut, Mic, MicOff, Search, Box, ArrowRight, Edit2, Save, X, MinusCircle, ChevronRight, Table as TableIcon, Check, BarChart2, PieChart as PieChartIcon, TrendingUp, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Blindagem 1: Garante que o formatarTexto não quebre se receber números ou dados nulos
const formatarTexto = (texto?: any) => {
  if (!texto || typeof texto !== 'string') return '';
  const limpo = texto.trim();
  if (limpo.length === 0) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
};

// Blindagem de Datas: Valida rigorosamente no formato DD/MM/AAAA brasileiro
const formatarData = (dataRaw?: string | null) => {
  if (!dataRaw || dataRaw.trim() === '-' || dataRaw.trim() === '') return '';
  
  const regex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const match = dataRaw.trim().match(regex);
  
  if (!match) return '';

  let dia = parseInt(match[1], 10);
  let mes = parseInt(match[2], 10);
  let ano = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  // Corrige ano curto (25 → 2025)
  if (ano < 100) ano += 2000;

  // Se mês > 12 mas dia <= 12, assume que veio invertido (MM/DD)
  if (mes > 12 && dia <= 12) {
    [dia, mes] = [mes, dia];
  }

  // Validação básica de mês
  if (mes < 1 || mes > 12) return '';

  // Dias máximos por mês (considerando ano bissexto para fevereiro)
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const diasPorMes = [0, 31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDia = diasPorMes[mes];

  if (dia < 1 || dia > maxDia) return '';

  // Validação de ano razoável (entre 2020 e 2099)
  if (ano < 2020 || ano > 2099) return '';

  // Se o ano for menor que o atual, provavelmente o usuário esqueceu o ano e a IA chutou errado.
  // Vamos forçar para o ano atual do sistema se a data extraída parecer retroativa sem motivo.
  const anoAtual = new Date().getFullYear();
  if (ano < anoAtual) {
    ano = anoAtual;
  }

  return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
};

// Função para renderizar labels customizadas no PieChart do Dashboard
const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props;
  const RADIAN = Math.PI / 180;
  
  // Posição Interna (% dentro da rosca)
  const radiusInner = innerRadius + (outerRadius - innerRadius) * 0.5;
  const ix = cx + radiusInner * Math.cos(-midAngle * RADIAN);
  const iy = cy + radiusInner * Math.sin(-midAngle * RADIAN);
  
  // Posição Externa (Quantidade ao lado)
  const radiusOuter = outerRadius + 30;
  const ex = cx + radiusOuter * Math.cos(-midAngle * RADIAN);
  const ey = cy + radiusOuter * Math.sin(-midAngle * RADIAN);
  
  return (
    <g>
      {/* % dentro da barra */}
      {percent > 0.05 && (
        <text x={ix} y={iy} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="900">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      )}
      {/* Quantidade ao lado */}
      <text x={ex} y={ey} fill="#64748b" textAnchor={ex > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="800">
        {value}
      </text>
    </g>
  );
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

  // Inventory Dashboard States
  const [activeTab, setActiveTab] = useState<'entrada' | 'inventário' | 'consumo' | 'dashboard'>('entrada');
  const [fullInventory, setFullInventory] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para edição e consumo de itens
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<any>(null);
  const [consumeHistory, setConsumeHistory] = useState<any[]>([]);
  const [isConsumoMode, setIsConsumoMode] = useState(false);

  // --- Função centralizada para carregar unidades do usuário ---
  const carregarUnidades = async (userId: string): Promise<Unidade[]> => {
    console.log("[OrdoDomus] carregarUnidades para:", userId);
    try {
      const { data: membros, error: erroMembros } = await supabase
        .from('membros_unidade')
        .select('unidade_id, papel, status')
        .eq('user_id', userId)
        .eq('status', 'aprovado');

      if (erroMembros || !membros || membros.length === 0) {
        console.log("[OrdoDomus] Nenhum membro aprovado encontrado:", erroMembros);
        return [];
      }

      const unidadeIds = membros.map(m => m.unidade_id);

      const { data: unidadesData, error: erroUnidades } = await supabase
        .from('unidades')
        .select('id, nome')
        .in('id', unidadeIds);

      if (erroUnidades || !unidadesData) {
        console.error("[OrdoDomus] Erro ao buscar unidades:", erroUnidades);
        return [];
      }

      const lista: Unidade[] = membros.map(m => {
        const unidade = unidadesData.find(u => u.id === m.unidade_id);
        if (!unidade) return null;
        return { id: unidade.id, nome: unidade.nome, papel: m.papel, status: m.status };
      }).filter(Boolean) as Unidade[];

      console.log("[OrdoDomus] Lista processada:", JSON.stringify(lista));
      return lista;
    } catch (e) {
      console.error("[OrdoDomus] Exceção em carregarUnidades:", e);
      return [];
    }
  };

  const carregarInventarioCompleto = async (silent = false) => {
    if (!unidadeAtiva) return;
    if (!silent) setIsInventoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_inventario')
        .select('*')
        .eq('unidade_id', unidadeAtiva.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setFullInventory(data || []);
    } catch (err) {
      console.error('Erro ao carregar inventário:', err);
    } finally {
      if (!silent) setIsInventoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventário' || activeTab === 'dashboard' || activeTab === 'consumo') {
      carregarInventarioCompleto();
    }
  }, [activeTab, unidadeAtiva]);

  // --- FUNÇÕES DE EDIÇÃO DE ITENS ---
  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditingItemData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemData(null);
  };

  const handleUpdateItem = async () => {
    if (!editingItemId || !editingItemData) return;
    try {
      const { error } = await supabase
        .from('itens_inventario')
        .update({
          nome: editingItemData.nome,
          categoria: editingItemData.categoria,
          comodo: editingItemData.comodo,
          armario: editingItemData.armario,
          caixa: editingItemData.caixa,
          quantidade: editingItemData.quantidade,
          validade: editingItemData.validade
        })
        .eq('id', editingItemId);
      if (error) throw error;
      await carregarInventarioCompleto();
      handleCancelEdit();
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await supabase.from('itens_inventario').delete().eq('id', id);
      await carregarInventarioCompleto();
    } catch (err) {
      console.error("Erro ao deletar item:", err);
    }
  };

  const handleConsumeItem = async (item: any) => {
    if (item.quantidade <= 0) {
      toast.error("Quantidade já está em zero.");
      return;
    }

    const novaQtd = Number(item.quantidade) - 1;
    
    try {
      const { error } = await supabase
        .from('itens_inventario')
        .update({ quantidade: novaQtd })
        .eq('id', item.id);

      if (error) throw error;

      // Guardar no histórico local para desfazer
      setConsumeHistory(prev => [{ id: item.id, oldQty: item.quantidade }, ...prev.slice(0, 4)]);
      
      toast.success(`Consumido 1 unid. de ${item.nome}`, {
        action: {
          label: "Desfazer",
          onClick: () => handleUndoConsume(item.id, item.quantidade)
        }
      });

      await carregarInventarioCompleto(true);
    } catch (err) {
      console.error("Erro ao consumir item:", err);
      toast.error("Erro ao registrar consumo.");
    }
  };

  const handleUndoConsume = async (id: string, oldQty: number) => {
    try {
      const { error } = await supabase
        .from('itens_inventario')
        .update({ quantidade: oldQty })
        .eq('id', id);

      if (error) throw error;

      toast.success("Consumo desfeito.");
      await carregarInventarioCompleto(true);
    } catch (err) {
      console.error("Erro ao desfazer consumo:", err);
      toast.error("Não foi possível desfazer.");
    }
  };

  // --- LOGOUT: Limpa estado React e encerra sessão globalmente ---
  const isLoggingOut = useRef(false);

  const handleLogout = async () => {
    console.log("[OrdoDomus] Logout...");
    isLoggingOut.current = true;
    setCurrentUserEmail(null);
    setCurrentUserId(null);
    setUnidades([]);
    setUnidadeAtiva(null);
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
    setError(null);
    setIsAuthLoading(false);
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.error("[OrdoDomus] Erro no signOut:", e);
    }
    setTimeout(() => { isLoggingOut.current = false; }, 2000);
  };

  // --- AUTH: Um único useEffect para tudo ---
  useEffect(() => {
    let cancelled = false;
    const processarSessao = async (userId: string, email: string | undefined) => {
      if (cancelled || isLoggingOut.current) return;
      try {
        const lista = await carregarUnidades(userId);
        if (cancelled || isLoggingOut.current) return;
        setCurrentUserId(userId);
        setCurrentUserEmail(email || null);
        setUnidades(lista);
        if (lista.length === 1) {
          setUnidadeAtiva(lista[0]);
        } else {
          setUnidadeAtiva(null);
        }
      } catch (e) {
        console.error("[OrdoDomus] Erro ao processar sessão:", e);
        if (!cancelled) {
          setCurrentUserId(userId);
          setCurrentUserEmail(email || null);
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    const inicializar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          await processarSessao(session.user.id, session.user.email);
        } else {
          setIsAuthLoading(false);
        }
      } catch (e) {
        console.error("[OrdoDomus] Erro na inicialização:", e);
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    inicializar();
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("[OrdoDomus] Timeout de segurança atingido (10s)");
        setIsAuthLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isLoggingOut.current) return;
      if (event === 'SIGNED_IN' && session?.user) {
        await processarSessao(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        if (cancelled) return;
        setCurrentUserEmail(null);
        setCurrentUserId(null);
        setUnidades([]);
        setUnidadeAtiva(null);
        setHistory([]);
        setIsAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // --- MICROFONE ---
  const [isRecording, setIsRecording] = useState(false);
  const toggleRecording = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       setError("Seu navegador não suporta gravação de áudio.");
       return;
    }
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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleExtract = async () => {
    if (!input.trim()) return;
    if (!unidadeAtiva) {
      setError("Unidade não identificada. Faça login para extrair dados.");
      return;
    }
    setIsExtracting(true);
    setError(null);
    setCurrentResult(null);
    setMergeStatus(null);
    try {
      const dataRaw = await extractInventoryData(input);
      const data: ExtractedItem = {
        item: formatarTexto(dataRaw.item) || 'Item sem nome',
        categoria: dataRaw.categoria || '',
        comodo: formatarTexto(dataRaw.comodo) || 'Não informado',
        armario: formatarTexto(dataRaw.armario) || '',
        caixa: formatarTexto(dataRaw.caixa) || '',
        validade: formatarData(dataRaw.validade) || '',
        quantidade: Number(dataRaw.quantidade) || 1
      };
      setCurrentResult(data);
      const { data: resultado, error: erroUpsert } = await supabase.rpc('upsert_inventario', {
        p_unidade_id: unidadeAtiva.id,
        p_nome: data.item,
        p_categoria: data.categoria,
        p_comodo: data.comodo,
        p_armario: data.armario,
        p_caixa: data.caixa,
        p_quantidade: data.quantidade,
        p_validade: data.validade
      });
      if (erroUpsert) throw new Error('Falha ao gravar no banco de dados.');
      const acaoFinal = resultado.acao as 'MERGE' | 'ADD';
      const mensagem = acaoFinal === 'MERGE'
        ? 'A quantidade foi somada a um item existente!'
        : 'Item gravado com sucesso no inventário!';
      const itemNaTela: ExtractedItem = {
        item: resultado.nome,
        categoria: resultado.categoria,
        comodo: resultado.comodo,
        armario: resultado.armario,
        caixa: resultado.caixa,
        validade: resultado.validade || '',
        quantidade: Number(resultado.quantidade)
      };
      setHistory(prev => [itemNaTela, ...prev]);
      setMergeStatus({ action: acaoFinal, message: mensagem });
      setInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message && err.message.includes('503') ? 'O servidor de IA está com alta demanda. Respire fundo, aguarde 5 segundos e tente novamente.' : 'Ocorreu um erro ao processar a frase. Verifique a conexão e tente novamente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
    setMergeStatus(null);
  };

  const isSistemaLiberado = !isAuthLoading && unidadeAtiva;

  // Filtragem do inventário
  const filteredInventory = fullInventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.nome.toLowerCase().includes(searchLower) ||
      (item.categoria || '').toLowerCase().includes(searchLower) ||
      (item.comodo || '').toLowerCase().includes(searchLower)
    );
  });

  // Agrupamento por cômodo
  const groupedInventory = filteredInventory.reduce((acc: any, item) => {
    const local = item.comodo || 'Não Informado';
    if (!acc[local]) acc[local] = [];
    acc[local].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/10">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Ordo Domus</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isAuthLoading ? (
                  <span className="text-xs text-slate-400 animate-pulse">Sincronizando...</span>
                ) : unidadeAtiva ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary/70">
                    <MapPin className="h-3 w-3" />
                    <span>{unidadeAtiva.nome}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selecione uma Unidade</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSistemaLiberado && unidadeAtiva?.papel !== 'convidado' && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('entrada')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'entrada' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Entrada
                </button>
                <button 
                  onClick={() => { setActiveTab('inventário'); setIsConsumoMode(false); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'inventário' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Inventário
                </button>
                <button 
                  onClick={() => { setActiveTab('consumo'); setIsConsumoMode(true); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'consumo' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50/50'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'consumo' ? 'bg-white animate-pulse' : 'bg-rose-300'}`} />
                  Consumo
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              </div>
            )}

            {currentUserEmail && !isAuthLoading && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Usuário</span>
                  <span className="text-xs font-bold text-slate-600 leading-none">{currentUserEmail}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-destructive hover:bg-destructive/5 rounded-xl h-9 px-3">
                  <LogOut className="w-4 h-4" />
                  <span className="ml-2 text-xs font-bold">Sair</span>
                </Button>
              </div>
            )}
          </div>
        </header>

        {!currentUserEmail && !isAuthLoading && (
          <Card className="border-none shadow-xl rounded-[32px] max-w-md mx-auto my-12 bg-white overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="text-center pt-10 pb-2">
              <CardTitle className="text-2xl font-bold text-slate-900">Bem-vindo</CardTitle>
              <CardDescription className="text-slate-500">Organize seu lar com inteligência</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Auth />
            </CardContent>
          </Card>
        )}

        <div className={`transition-all duration-500 ${!currentUserEmail ? 'opacity-0 scale-95 pointer-events-none hidden' : 'opacity-100 scale-100'} mt-4`}>
          {currentUserEmail && !unidadeAtiva && unidades.length > 1 ? (
             <div className="text-center p-12 bg-white rounded-[32px] shadow-sm max-w-lg mx-auto border border-slate-100 mt-12">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <MapPin className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Selecione uma Unidade</h2>
                <p className="text-slate-500 mt-2 mb-8">Qual unidade você deseja gerenciar hoje?</p>
                <div className="space-y-3">
                  {unidades.map(u => (
                     <Button key={u.id} variant="outline" className="w-full justify-start h-14 text-base rounded-2xl hover:bg-slate-50 border-slate-200" onClick={() => setUnidadeAtiva(u)}>
                       <div className="flex flex-col items-start">
                         <span className="font-bold text-slate-900">{u.nome}</span>
                         <span className="text-xs text-slate-400 uppercase font-medium">{u.papel}</span>
                       </div>
                       <ArrowRight className="ml-auto w-5 h-5 text-slate-300" />
                     </Button>
                  ))}
                </div>
             </div>
          ) : currentUserEmail && !unidadeAtiva && unidades.length === 0 ? (
             <Onboarding onSuccess={async () => {
               const { data: { session } } = await supabase.auth.getSession();
               if (session?.user) {
                 const lista = await carregarUnidades(session.user.id);
                 setUnidades(lista);
                 if (lista.length === 1) setUnidadeAtiva(lista[0]);
               }
             }} />
          ) : isSistemaLiberado && unidadeAtiva?.status === 'pendente' ? (
             <div className="text-center p-12 bg-white rounded-[32px] shadow-sm max-w-lg mx-auto border border-slate-100 mt-12">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Aguardando Aprovação</h2>
                <p className="text-slate-500 mt-2">O administrador da unidade precisa aprovar seu acesso para liberar o inventário.</p>
             </div>
          ) : isSistemaLiberado && unidadeAtiva?.papel === 'convidado' ? (
             <GuestView unidadeId={unidadeAtiva.id} />
          ) : (
            <div className="space-y-8">
               {isSistemaLiberado && unidadeAtiva?.papel !== 'convidado' && <AdminPanel unidadeId={unidadeAtiva.id} papel={unidadeAtiva.papel} />}
               
               <AnimatePresence mode="wait">
                 {activeTab === 'dashboard' ? (
                   <motion.div 
                     key="dashboard"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="space-y-1"
                   >
                     <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                          <BarChart2 className="w-7 h-7 text-primary" />
                          Dashboard Analytics
                        </h2>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => carregarInventarioCompleto()}
                          className="text-slate-400 hover:text-primary rounded-xl"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isInventoryLoading ? 'animate-spin' : ''}`} />
                          Atualizar
                        </Button>
                      </div>

                     {isInventoryLoading ? (
                       <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 bg-white rounded-[32px] border border-slate-100">
                         <Loader2 className="w-12 h-12 text-primary animate-spin" />
                         <p className="font-bold uppercase text-[10px] tracking-widest">Sincronizando Analytics...</p>
                       </div>
                     ) : fullInventory.length === 0 ? (
                       <div className="text-center py-24 bg-white rounded-[32px] shadow-sm border border-slate-100">
                         <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-200" />
                         <p className="text-slate-500 font-medium text-lg">Ainda não há dados suficientes para gerar o Dashboard.</p>
                         <p className="text-slate-400 text-sm mt-1">Comece adicionando itens no menu Entrada.</p>
                       </div>
                     ) : (
                       <div className="space-y-12">
                         {/* KPI Cards */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                 <Box className="w-6 h-6" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Itens</p>
                                 <h3 className="text-2xl font-black text-slate-900">{fullInventory.reduce((acc, i) => acc + (i.quantidade || 0), 0)}</h3>
                               </div>
                             </div>
                           </Card>

                           <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                                 <AlertTriangle className="w-6 h-6" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Crítico</p>
                                 <h3 className="text-2xl font-black text-slate-900">{fullInventory.filter(i => (i.quantidade || 0) <= 1).length}</h3>
                               </div>
                             </div>
                           </Card>

                           <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                                 <Clock className="w-6 h-6" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Vencer (30d)</p>
                                 <h3 className="text-2xl font-black text-slate-900">
                                   {fullInventory.filter(item => {
                                     if (!item.validade) return false;
                                     const parts = item.validade.split('/');
                                     let expiryDate;
                                     if (parts.length === 3) expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                     else if (parts.length === 2) expiryDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
                                     else return false;
                                     const diffDays = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                     return diffDays >= 0 && diffDays <= 30;
                                   }).length}
                                 </h3>
                               </div>
                             </div>
                           </Card>

                           <Card className="border-none shadow-sm rounded-[28px] bg-white p-6 border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                                 <TrendingUp className="w-6 h-6" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</p>
                                 <h3 className="text-2xl font-black text-slate-900">R$ 0,00</h3>
                               </div>
                             </div>
                           </Card>
                         </div>

                         {/* Charts Row */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 border border-slate-100">
                             <div className="flex items-center justify-between mb-8">
                               <div>
                                 <h3 className="text-lg font-black text-slate-800 tracking-tight">Distribuição por Cômodo</h3>
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Volume total por ambiente</p>
                               </div>
                               <div className="p-2 bg-slate-50 rounded-xl">
                                 <MapPin className="w-5 h-5 text-slate-300" />
                               </div>
                             </div>
                             
                             <div className="h-[300px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                 <BarChart 
                                   data={Object.entries(
                                     fullInventory.reduce((acc: any, item: any) => {
                                       const comodo = item.comodo || 'Outros';
                                       acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                       return acc;
                                     }, {})
                                   ).map(([name, total]) => ({ name, total }))}
                                   layout="vertical"
                                   margin={{ left: 20, right: 30, top: 0, bottom: 0 }}
                                 >
                                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                   <XAxis type="number" hide />
                                   <YAxis 
                                     dataKey="name" 
                                     type="category" 
                                     width={100} 
                                     axisLine={false} 
                                     tickLine={false} 
                                     tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                                   />
                                   <Tooltip 
                                     cursor={{ fill: '#f8fafc' }}
                                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                   />
                                   <Bar 
                                     dataKey="total" 
                                     fill="#6366f1" 
                                     radius={[0, 8, 8, 0]} 
                                     barSize={24}
                                   />
                                 </BarChart>
                               </ResponsiveContainer>
                             </div>
                           </Card>

                           <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 border border-slate-100">
                             <div className="flex items-center justify-between mb-8">
                               <div>
                                 <h3 className="text-lg font-black text-slate-800 tracking-tight">Categorias de Produtos</h3>
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Mix de produtos por tipo</p>
                               </div>
                               <div className="p-2 bg-slate-50 rounded-xl">
                                 <PieChartIcon className="w-5 h-5 text-slate-300" />
                               </div>
                             </div>

                             <div className="h-[300px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                   <Pie
                                     data={Object.entries(
                                       fullInventory.reduce((acc: any, item: any) => {
                                         const cat = item.categoria || 'Geral';
                                         acc[cat] = (acc[cat] || 0) + (item.quantidade || 0);
                                         return acc;
                                       }, {})
                                     ).map(([name, value]) => ({ name, value }))}
                                     cx="50%"
                                     cy="50%"
                                     innerRadius={60}
                                     outerRadius={90}
                                     paddingAngle={8}
                                     dataKey="value"
                                     label={renderPieLabel}
                                     labelLine={false}
                                   >
                                     {['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'].map((color, index) => (
                                       <Cell key={`cell-${index}`} fill={color} />
                                     ))}
                                   </Pie>
                                   <Tooltip 
                                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                   />
                                   <Legend verticalAlign="bottom" height={36}/>
                                 </PieChart>
                               </ResponsiveContainer>
                             </div>
                           </Card>
                         </div>

                         {/* Itens em Destaque */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                               <AlertTriangle className="w-5 h-5 text-rose-500" />
                               Reposição Sugerida
                             </h3>
                             <div className="space-y-4">
                               {fullInventory.filter(i => (i.quantidade || 0) <= 1).slice(0, 5).map(item => (
                                 <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                   <div className="flex flex-col">
                                     <span className="font-bold text-slate-700">{item.nome}</span>
                                     <span className="text-[10px] text-slate-400 font-bold uppercase">{item.comodo}</span>
                                   </div>
                                   <div className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-black">
                                     {item.quantidade} un
                                   </div>
                                 </div>
                               ))}
                               {fullInventory.filter(i => (i.quantidade || 0) <= 1).length === 0 && (
                                 <p className="text-slate-400 text-center py-4 italic text-sm font-medium">Estoque saudável!</p>
                               )}
                             </div>
                           </div>

                           <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200">
                             <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                               <Clock className="w-5 h-5 text-primary" />
                               Ações Recentes
                             </h3>
                             <div className="space-y-4">
                               {history.slice(0, 5).map((item, idx) => (
                                 <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                   <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                     <Plus className="w-4 h-4 text-primary" />
                                   </div>
                                   <div className="flex flex-col flex-1">
                                     <span className="font-bold text-white text-sm leading-tight">{item.item}</span>
                                     <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Adicionado à {item.comodo}</span>
                                   </div>
                                   <div className="text-primary font-black text-xs">
                                     +{item.quantidade}
                                   </div>
                                 </div>
                               ))}
                               {history.length === 0 && (
                                 <p className="text-white/40 text-center py-4 italic text-sm font-medium">Nenhuma atividade recente.</p>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </motion.div>
                 ) : activeTab === 'entrada' ? (
                   <motion.div 
                     key="entrada"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     transition={{ duration: 0.3 }}
                     className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                   >
                     <div className="lg:col-span-5 space-y-6">
                       <Card className="border-none shadow-lg rounded-[32px] bg-white overflow-hidden">
                         <div className="h-1.5 bg-primary w-full opacity-50" />
                         <CardHeader>
                           <CardTitle className="text-xl font-bold text-slate-900">Nova Entrada</CardTitle>
                           <CardDescription className="text-slate-500">Registre itens usando sua voz ou texto</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-6">
                           <div className="space-y-3">
                             <div className="flex justify-end">
                               <Button 
                                 variant={isRecording ? "destructive" : "secondary"}
                                 size="sm"
                                 onClick={toggleRecording}
                                 disabled={isExtracting || !isSistemaLiberado}
                                 className={`gap-2 rounded-xl transition-all h-10 px-5 ${isRecording ? "animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                               >
                                 {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                 {isRecording ? "Parar" : "Falar"}
                               </Button>
                             </div>
                             <Textarea
                               placeholder="Ex: Guardei 2 pacotes de café no armário superior da cozinha..."
                               className="min-h-[140px] resize-none rounded-[20px] bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 text-base p-5"
                               value={input}
                               onChange={(e) => setInput(e.target.value)}
                               disabled={isExtracting || !isSistemaLiberado}
                             />
                           </div>
                           {error && <p className="text-sm text-destructive font-medium bg-destructive/5 p-3 rounded-xl border border-destructive/10">{error}</p>}
                           <Button className="w-full rounded-[20px] h-14 text-lg font-bold shadow-lg shadow-primary/20" onClick={handleExtract} disabled={isExtracting || !input.trim() || !isSistemaLiberado}>
                             {isExtracting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : <><Box className="mr-2 h-5 w-5" /> Extrair e Salvar</>}
                           </Button>
                         </CardContent>
                       </Card>

                       {currentResult && (
                         <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                           <Card className="border-none shadow-md rounded-[32px] overflow-hidden bg-white border border-primary/5">
                             <div className="bg-primary/5 px-6 py-4 flex justify-between items-center border-b border-primary/5">
                               <h3 className="font-bold text-primary flex items-center gap-2">
                                 <Tag className="w-4 h-4" /> Item Identificado
                               </h3>
                               <Badge className="rounded-full px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                                 {currentResult.categoria || 'Geral'}
                               </Badge>
                             </div>
                             <CardContent className="p-6 space-y-6">
                               <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-1">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto</p>
                                   <p className="font-bold text-slate-900 text-lg">{currentResult.item}</p>
                                 </div>
                                 <div className="space-y-1">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantidade</p>
                                   <p className="font-bold text-slate-900 text-lg">{currentResult.quantidade}</p>
                                 </div>
                                 <div className="col-span-2 p-4 bg-slate-50 rounded-2xl space-y-3">
                                   <div className="flex items-center gap-3">
                                     <MapPin className="w-4 h-4 text-primary opacity-60" />
                                     <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Localização</p>
                                       <p className="text-sm font-bold text-slate-700">{currentResult.comodo} {currentResult.armario && `• ${currentResult.armario}`} {currentResult.caixa && `• ${currentResult.caixa}`}</p>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                               {mergeStatus && (
                                 <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${mergeStatus.action === 'MERGE' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mergeStatus.action === 'MERGE' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                                     {mergeStatus.action === 'MERGE' ? <RefreshCw className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                   </div>
                                   {mergeStatus.message}
                                 </div>
                               )}
                             </CardContent>
                           </Card>
                         </motion.div>
                       )}
                     </div>

                     <div className="lg:col-span-7">
                       <Card className="border-none shadow-lg rounded-[32px] h-full flex flex-col bg-white overflow-hidden">
                         <CardHeader className="pb-4 flex flex-row items-center justify-between">
                           <div>
                             <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                               <History className="w-5 h-5 text-slate-400" /> Histórico da Sessão
                             </CardTitle>
                             <CardDescription>Últimos itens adicionados</CardDescription>
                           </div>
                           {history.length > 0 && (
                             <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-slate-400 hover:text-destructive rounded-xl">
                               <Trash2 className="w-4 h-4 mr-2" /> Limpar
                             </Button>
                           )}
                         </CardHeader>
                         <CardContent className="flex-1 p-0">
                           {history.length === 0 ? (
                             <div className="h-64 flex flex-col items-center justify-center text-slate-300 p-6 text-center">
                               <Box className="w-16 h-16 mb-4 opacity-10" />
                               <p className="font-medium">Nenhum item processado nesta sessão.</p>
                             </div>
                           ) : (
                             <ScrollArea className="h-[600px] w-full">
                               <Table>
                                 <TableHeader className="bg-slate-50/50 sticky top-0 backdrop-blur-md">
                                   <TableRow className="border-slate-100">
                                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Item</TableHead>
                                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Onde</TableHead>
                                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Qtd</TableHead>
                                   </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                   {history.map((item, idx) => (
                                     <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                       <TableCell>
                                         <div className="flex flex-col">
                                           <span className="font-bold text-slate-700">{item.item}</span>
                                           <span className="text-[10px] text-slate-400 font-bold uppercase">{item.categoria}</span>
                                         </div>
                                       </TableCell>
                                       <TableCell className="text-sm font-medium text-slate-600">
                                         {item.comodo} <span className="text-slate-300 mx-1">•</span> {item.armario || '-'}
                                       </TableCell>
                                       <TableCell className="text-center font-bold text-primary">{item.quantidade}</TableCell>
                                     </TableRow>
                                   ))}
                                 </TableBody>
                               </Table>
                             </ScrollArea>
                           )}
                         </CardContent>
                       </Card>
                     </div>
                   </motion.div>
                 ) : (activeTab === 'inventário' || activeTab === 'consumo') ? (
                   <motion.div 
                     key={activeTab}
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.98 }}
                     className="space-y-6"
                   >
                     {/* SEARCH BAR */}
                     <div className="relative group">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                       <input 
                         type="text"
                         placeholder="Procurar no inventário (ex: Arroz, Cozinha, Limpeza...)"
                         className="w-full h-16 pl-14 pr-6 rounded-[24px] bg-white border-none shadow-lg shadow-slate-200/50 focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>

                     {isInventoryLoading ? (
                       <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                         <div className="relative">
                            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                         </div>
                         <p className="font-bold animate-pulse uppercase text-xs tracking-widest">Sincronizando Banco de Dados...</p>
                       </div>
                     ) : filteredInventory.length === 0 ? (
                       <div className="text-center py-24 bg-white rounded-[32px] shadow-sm border border-slate-100">
                         <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                         <p className="text-slate-500 font-medium text-lg">Nenhum item encontrado com "{searchTerm}"</p>
                       </div>
                     ) : (
                       <div className="space-y-12 pb-12">
                         {Object.entries(groupedInventory).map(([comodo, itens]: [string, any]) => (
                           <div key={comodo} className="space-y-6">
                             <div className="flex items-center gap-3 px-2">
                               <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                 <MapPin className="w-4 h-4" />
                               </div>
                               <h2 className="text-xl font-bold text-slate-800">{comodo}</h2>
                               <Badge variant="outline" className="rounded-full border-slate-200 text-slate-400 font-bold">
                                 {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                               </Badge>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {itens.map((item: any) => {
                                  const isEditing = editingItemId === item.id;
                                  
                                  return (
                                    <motion.div 
                                      layout
                                      key={item.id} 
                                      whileHover={isEditing ? {} : { y: -5 }}
                                      className={`group relative bg-white p-6 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 transition-all cursor-default ${isEditing ? 'ring-2 ring-primary ring-offset-4' : ''}`}
                                    >
                                      {/* Ações (Edit/Delete) - visíveis no hover ou quando editando */}
                                      {!isEditing && !isConsumoMode && (
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => handleStartEdit(item)}
                                            className="p-2 bg-slate-100 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-xl transition-colors"
                                            title="Editar item"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-2 bg-slate-100 hover:bg-destructive/10 text-slate-400 hover:text-destructive rounded-xl transition-colors"
                                            title="Excluir item"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      )}

                                      {isEditing ? (
                                        <div className="space-y-4">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Modo Edição</span>
                                            <div className="flex gap-2">
                                              <button onClick={handleCancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600">
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-3">
                                            <input 
                                              type="text" 
                                              value={editingItemData.nome || ''}
                                              onChange={(e) => setEditingItemData({...editingItemData, nome: e.target.value})}
                                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                              placeholder="Nome do item"
                                            />
                                            <input 
                                              type="text" 
                                              value={editingItemData.categoria || ''}
                                              onChange={(e) => setEditingItemData({...editingItemData, categoria: e.target.value})}
                                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-primary/60 uppercase text-[10px] tracking-widest focus:ring-2 focus:ring-primary/20 outline-none"
                                              placeholder="Categoria"
                                            />
                                            <div className="flex items-center gap-3">
                                              <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1">Cômodo</p>
                                                <input 
                                                  type="text" 
                                                  value={editingItemData.comodo || ''}
                                                  onChange={(e) => setEditingItemData({...editingItemData, comodo: e.target.value})}
                                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                  placeholder="Ex: Cozinha"
                                                />
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1">Quantidade</p>
                                                <input 
                                                  type="number" 
                                                  value={editingItemData.quantidade}
                                                  onChange={(e) => setEditingItemData({...editingItemData, quantidade: Number(e.target.value)})}
                                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                              <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1">Armário/Prateleira</p>
                                                <input 
                                                  type="text" 
                                                  value={editingItemData.armario || ''}
                                                  onChange={(e) => setEditingItemData({...editingItemData, armario: e.target.value})}
                                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                  placeholder="Local exato"
                                                />
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1">Caixa/Gaveta</p>
                                                <input 
                                                  type="text" 
                                                  value={editingItemData.caixa || ''}
                                                  onChange={(e) => setEditingItemData({...editingItemData, caixa: e.target.value})}
                                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                  placeholder="Identificador"
                                                />
                                              </div>
                                            </div>

                                            <div>
                                              <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1">Validade</p>
                                              <input 
                                                type="text" 
                                                value={editingItemData.validade || ''}
                                                onChange={(e) => setEditingItemData({...editingItemData, validade: e.target.value})}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                placeholder="Ex: 12/2026"
                                              />
                                            </div>
                                          </div>

                                          <Button onClick={handleUpdateItem} className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 mt-2">
                                            <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                              <Box className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mr-1">QTD</p>
                                              <div className="flex items-center gap-3">
                                                {isConsumoMode && (
                                                  <motion.button 
                                                    whileHover={{ scale: 1.05, backgroundColor: "#fff5f5" }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleConsumeItem(item)}
                                                    className="w-10 h-10 bg-white text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm transition-colors"
                                                    title="Subtrair 1 unidade"
                                                  >
                                                    <MinusCircle className="w-5 h-5" />
                                                  </motion.button>
                                                )}
                                                <motion.div 
                                                  key={item.quantidade}
                                                  initial={{ scale: 1.1, backgroundColor: "#fecdd3" }}
                                                  animate={{ scale: 1, backgroundColor: "#0f172a" }}
                                                  className="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg"
                                                >
                                                  {item.quantidade}
                                                </motion.div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-1 mb-4">
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{item.nome}</h3>
                                            <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">{item.categoria || 'Sem Categoria'}</p>
                                          </div>

                                          <div className="space-y-3 pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-2 text-slate-500">
                                              <Layers className="w-3.5 h-3.5 opacity-40" />
                                              <span className="text-xs font-bold">{item.armario || 'Local não especificado'}</span>
                                            </div>
                                            {item.caixa && (
                                              <div className="flex items-center gap-2 text-slate-500">
                                                <Archive className="w-3.5 h-3.5 opacity-40" />
                                                <span className="text-xs font-bold">{item.caixa}</span>
                                              </div>
                                            )}
                                            {item.validade && (
                                              (() => {
                                                const parts = item.validade.split('/');
                                                let expiryDate;
                                                if (parts.length === 3) expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                                else if (parts.length === 2) expiryDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
                                                else return null;

                                                const diffDays = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                
                                                if (diffDays < 0) {
                                                  return (
                                                    <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100 animate-pulse">
                                                      <AlertTriangle className="w-3.5 h-3.5" />
                                                      <span className="text-[10px] font-black uppercase tracking-tighter">Vencido em {item.validade}</span>
                                                    </div>
                                                  );
                                                } else if (diffDays <= 30) {
                                                  return (
                                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-100">
                                                      <Clock className="w-3.5 h-3.5" />
                                                      <span className="text-[10px] font-black uppercase tracking-tighter">Vence em {item.validade} ({diffDays}d)</span>
                                                    </div>
                                                  );
                                                } else {
                                                  return (
                                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100/50 opacity-60">
                                                      <Calendar className="w-3.5 h-3.5" />
                                                      <span className="text-[10px] font-black uppercase tracking-tighter">Validade: {item.validade}</span>
                                                    </div>
                                                  );
                                                }
                                              })()
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  );
                                })}
                             </div>
                           </div>
                         ))}
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
