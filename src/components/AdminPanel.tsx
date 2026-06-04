import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Loader2, Share2, Check, Copy, ShieldCheck, UserMinus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

interface Props {
  unidadeId: string;
  papel: string;
  unidadeNome?: string;
}

interface UnitMember {
  unidade_id: string;
  user_id: string;
  papel: string;
  status: string;
  adicionado_em: string;
}

const MEMBERS_LOAD_TIMEOUT_MS = 6_000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      onTimeout();
      reject(new Error('Tempo limite excedido.'));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export default function AdminPanel({ unidadeId, papel, unidadeNome }: Props) {
  const [membros, setMembros] = useState<UnitMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const carregarMembros = async () => {
    if (papel !== 'admin') {
      setLoading(false);
      setLoadError(null);
      return;
    }
    
    setLoading(true);
    setLoadError(null);

    const abortController = new AbortController();

    try {
      // Tenta usar a nova função listar_membros, faz fallback se não existir
      const { data, error } = await withTimeout(
        supabase
          .rpc('listar_membros', { p_unidade_id: unidadeId })
          .abortSignal(abortController.signal),
        MEMBERS_LOAD_TIMEOUT_MS,
        () => abortController.abort()
      );
        
      if (!error && data) {
        setMembros(data);
        return;
      }

      if (error) logger.warn('RPC listar_membros indisponivel para o painel administrativo.');

      const fallbackController = new AbortController();
      const { data: dataOld, error: fallbackError } = await withTimeout(
        supabase
          .rpc('listar_pendentes', { p_unidade_id: unidadeId })
          .abortSignal(fallbackController.signal),
        MEMBERS_LOAD_TIMEOUT_MS,
        () => fallbackController.abort()
      );

      if (fallbackError) throw fallbackError;
      setMembros(dataOld || []);
    } catch {
      logger.warn('Falha ao carregar membros da unidade.');
      setMembros([]);
      setLoadError('Não foi possível carregar os acessos agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unidadeId) carregarMembros();
  }, [unidadeId, papel]);

  const aprovarConvidado = async (userId: string) => {
    const { error } = await supabase
      .rpc('aprovar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setMembros(prev => prev.map(m => m.user_id === userId ? { ...m, status: 'aprovado' } : m));
      toast.success("Membro aprovado com sucesso!");
    } else {
      toast.error("Erro ao aprovar membro.");
    }
  };

  const rejeitarOuRemover = async (userId: string, isRejeicao: boolean) => {
    const { error } = await supabase
      .rpc('rejeitar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setMembros(prev => prev.filter(m => m.user_id !== userId));
      toast.success(isRejeicao ? "Solicitação rejeitada." : "Acesso revogado.");
    } else {
      toast.error("Erro ao processar ação.");
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(unidadeId);
    setCopiado(true);
    toast.success("Código da unidade copiado!");
    setTimeout(() => setCopiado(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12" data-testid="admin-panel-loading">
      <Loader2 className="animate-spin w-8 h-8 text-slate-200" />
    </div>
  );

  const pendentes = membros.filter(m => m.status === 'pendente');
  const aprovados = membros.filter(m => m.status === 'aprovado');

  return (
    <div className="space-y-10">
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-3">
            <p className="text-sm font-bold leading-relaxed">{loadError}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={carregarMembros}
              className="h-9 rounded-xl bg-white px-4 text-xs font-black text-amber-700 hover:bg-amber-100"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* SEÇÃO: CONVITE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Share2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-xl leading-none mb-1">Acesso à Unidade</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{unidadeNome || 'Equipe'}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none px-4 py-1.5 rounded-full text-[10px] font-black">
            ATIVA
          </Badge>
        </div>

        <div className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
            Código Único de Identificação
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 px-6 py-5 bg-white rounded-2xl border border-slate-200 text-slate-700 font-mono text-sm font-bold tracking-tight shadow-sm overflow-hidden truncate">
              {unidadeId}
            </div>
            <Button 
              onClick={copiarCodigo}
              size="icon"
              className={`h-16 w-16 rounded-2xl transition-all shadow-xl active:scale-95 ${
                copiado ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
              }`}
            >
              {copiado ? <Check className="w-7 h-7" /> : <Copy className="w-6 h-6" />}
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-emerald-700/80 leading-relaxed font-bold">
              Segurança ativada: Compartilhe o código acima com os membros que deseja convidar para esta unidade. Novos acessos precisam da sua aprovação manual.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO: PENDENTES */}
      {pendentes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-xl leading-none mb-1">Solicitações</h3>
              <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Aprovações Pendentes</p>
            </div>
            <Badge className="bg-amber-500 text-white border-none font-black text-[10px] ml-auto">
              {pendentes.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {pendentes.map(convite => (
              <div 
                key={convite.user_id} 
                className="bg-white border border-slate-100 p-6 rounded-[28px] flex items-center justify-between group hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-300">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ID do Solicitante</span>
                    <span className="font-mono text-xs text-slate-600 font-bold">{convite.user_id.slice(0, 18)}...</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      Enviado em {new Date(convite.adicionado_em).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => rejeitarOuRemover(convite.user_id, true)} 
                    className="h-12 w-12 p-0 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    title="Rejeitar"
                  >
                    <UserMinus className="w-5 h-5" />
                  </Button>
                  <Button 
                    onClick={() => aprovarConvidado(convite.user_id)} 
                    className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-lg shadow-amber-200 transition-all active:scale-95"
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      APROVAR
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO: MEMBROS APROVADOS */}
      {aprovados.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-xl leading-none mb-1">Membros</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Equipe Ativa</p>
            </div>
            <Badge className="bg-slate-200 text-slate-600 border-none font-black text-[10px] ml-auto">
              {aprovados.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {aprovados.map(membro => (
              <div 
                key={membro.user_id} 
                className="bg-white border border-slate-100 p-6 rounded-[28px] flex items-center justify-between group hover:border-slate-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-700 font-bold">{membro.user_id.slice(0, 18)}...</span>
                      {membro.papel === 'admin' && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none text-[9px] px-2 py-0.5 font-black tracking-widest">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      Membro desde {new Date(membro.adicionado_em).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {membro.papel !== 'admin' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover este membro da unidade?')) {
                          rejeitarOuRemover(membro.user_id, false);
                        }
                      }} 
                      className="h-10 px-4 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
