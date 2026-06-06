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
  nome?: string | null;
  email?: string | null;
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
      <Loader2 className="h-8 w-8 animate-spin text-slate-200 dark:text-muted-foreground" />
    </div>
  );

  const pendentes = membros.filter(m => m.status === 'pendente');
  const aprovados = membros.filter(m => m.status === 'aprovado');

  return (
    <div className="space-y-10">
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-3">
            <p className="text-sm font-bold leading-relaxed">{loadError}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={carregarMembros}
              className="h-9 rounded-xl bg-white px-4 text-xs font-black text-amber-700 hover:bg-amber-100 dark:bg-card dark:text-amber-300 dark:hover:bg-amber-950/50"
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
            <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-950/40">
              <Share2 className="h-6 w-6 text-blue-500 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="mb-1 text-xl font-black leading-none text-slate-900 dark:text-foreground">Acesso à Unidade</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{unidadeNome || 'Equipe'}</p>
            </div>
          </div>
          <Badge variant="secondary" className="rounded-full border-none bg-slate-100 px-4 py-1.5 text-[10px] font-black text-slate-500 dark:bg-muted dark:text-muted-foreground">
            ATIVA
          </Badge>
        </div>

        <div className="rounded-[32px] border border-slate-100 bg-slate-50/50 p-8 dark:border-border dark:bg-muted/30">
          <p className="mb-4 ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
            Código Único de Identificação
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 overflow-hidden truncate rounded-2xl border border-slate-200 bg-white px-6 py-5 font-mono text-sm font-bold tracking-tight text-slate-700 shadow-sm dark:border-border dark:bg-card dark:text-foreground dark:shadow-none">
              {unidadeId}
            </div>
            <Button 
              onClick={copiarCodigo}
              size="icon"
              className={`h-16 w-16 rounded-2xl transition-all shadow-xl active:scale-95 ${
                copiado ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100 dark:shadow-none' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200 dark:bg-primary dark:text-primary-foreground dark:shadow-none dark:hover:bg-primary/90'
              }`}
            >
              {copiado ? <Check className="w-7 h-7" /> : <Copy className="w-6 h-6" />}
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-emerald-100/50 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-emerald-950/50 dark:shadow-none">
              <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            </div>
            <p className="text-xs font-bold leading-relaxed text-emerald-700/80 dark:text-emerald-200">
              Segurança ativada: Compartilhe o código acima com os membros que deseja convidar para esta unidade. Novos acessos precisam da sua aprovação manual.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO: PENDENTES */}
      {pendentes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/40">
              <Users className="h-6 w-6 text-amber-500 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="mb-1 text-xl font-black leading-none text-slate-900 dark:text-foreground">Solicitações</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500 dark:text-amber-300">Aprovações Pendentes</p>
            </div>
            <Badge className="bg-amber-500 text-white border-none font-black text-[10px] ml-auto">
              {pendentes.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {pendentes.map(convite => {
              const identity = getMemberIdentity(convite);
              return (
              <div 
                key={convite.user_id} 
                className="group flex items-center justify-between rounded-[28px] border border-slate-100 bg-white p-6 transition-all hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 dark:border-border dark:bg-card dark:hover:border-amber-900/70 dark:hover:shadow-none"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-300 dark:border-border dark:bg-muted dark:text-muted-foreground">
                    <Users className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-muted-foreground">Solicitante</span>
                    <span className={`text-sm font-black text-slate-700 dark:text-foreground ${identity.isFallback ? 'font-mono text-xs' : ''}`}>
                      {identity.primary}
                    </span>
                    {identity.secondary && (
                      <span className="mt-0.5 text-xs font-bold text-slate-500 dark:text-muted-foreground">{identity.secondary}</span>
                    )}
                    <span className="mt-1 text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
                      Enviado em {new Date(convite.adicionado_em).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => rejeitarOuRemover(convite.user_id, true)} 
                    className="h-12 w-12 rounded-2xl p-0 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500 dark:text-muted-foreground dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                    title="Rejeitar"
                  >
                    <UserMinus className="w-5 h-5" />
                  </Button>
                  <Button 
                    onClick={() => aprovarConvidado(convite.user_id)} 
                    className="h-12 rounded-2xl bg-amber-500 px-6 text-xs font-black text-white shadow-lg shadow-amber-200 transition-all hover:bg-amber-600 active:scale-95 dark:shadow-none"
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      APROVAR
                    </span>
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO: MEMBROS APROVADOS */}
      {aprovados.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-muted">
              <ShieldCheck className="h-6 w-6 text-slate-500 dark:text-muted-foreground" />
            </div>
            <div>
              <h3 className="mb-1 text-xl font-black leading-none text-slate-900 dark:text-foreground">Membros</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Equipe Ativa</p>
            </div>
            <Badge className="ml-auto border-none bg-slate-200 text-[10px] font-black text-slate-600 dark:bg-muted dark:text-muted-foreground">
              {aprovados.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {aprovados.map(membro => {
              const identity = getMemberIdentity(membro);
              return (
              <div 
                key={membro.user_id} 
                className="group flex items-center justify-between rounded-[28px] border border-slate-100 bg-white p-6 transition-all hover:border-slate-200 dark:border-border dark:bg-card dark:hover:border-muted-foreground/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 dark:border-border dark:bg-muted dark:text-muted-foreground">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black text-slate-700 dark:text-foreground ${identity.isFallback ? 'font-mono text-xs' : ''}`}>
                        {identity.primary}
                      </span>
                      {membro.papel === 'admin' && (
                        <Badge variant="secondary" className="border-none bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    {identity.secondary && (
                      <span className="mt-0.5 text-xs font-bold text-slate-500 dark:text-muted-foreground">{identity.secondary}</span>
                    )}
                    <span className="mt-1 text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
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
                      className="h-10 rounded-xl px-4 text-xs font-bold text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-muted-foreground dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getMemberIdentity(member: UnitMember) {
  const name = member.nome?.trim();
  const email = member.email?.trim();
  const fallback = `${member.user_id.slice(0, 18)}...`;

  if (name) {
    return {
      primary: name,
      secondary: email || fallback,
      isFallback: false,
    };
  }

  if (email) {
    return {
      primary: email,
      secondary: fallback,
      isFallback: false,
    };
  }

  return {
    primary: fallback,
    secondary: null,
    isFallback: true,
  };
}
