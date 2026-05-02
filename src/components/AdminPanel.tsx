import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, Share2, Check, Copy, ShieldCheck, UserMinus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  unidadeId: string;
  papel: string;
  unidadeNome?: string;
}

export default function AdminPanel({ unidadeId, papel, unidadeNome }: Props) {
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const carregarPendentes = async () => {
    if (papel !== 'admin') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .rpc('listar_pendentes', { p_unidade_id: unidadeId });
      
    if (!error && data) {
      setPendentes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (unidadeId) carregarPendentes();
  }, [unidadeId, papel]);

  const aprovarConvidado = async (userId: string) => {
    const { error } = await supabase
      .rpc('aprovar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setPendentes(prev => prev.filter(p => p.user_id !== userId));
      toast.success("Membro aprovado com sucesso!");
    } else {
      toast.error("Erro ao aprovar membro.");
    }
  };

  const rejeitarConvidado = async (userId: string) => {
    const { error } = await supabase
      .rpc('rejeitar_membro', { p_unidade_id: unidadeId, p_user_id: userId });

    if (!error) {
      setPendentes(prev => prev.filter(p => p.user_id !== userId));
      toast.error("Solicitação rejeitada.");
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
    <div className="flex items-center justify-center p-12">
      <Loader2 className="animate-spin w-8 h-8 text-slate-200" />
    </div>
  );

  return (
    <div className="space-y-10">
      {/* SEÇÃO: CONVITE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Share2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-xl leading-none mb-1">Convidar Membros</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{unidadeNome || 'Acesso à Unidade'}</p>
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
              Segurança ativada: novos membros dependem da sua aprovação manual no painel abaixo.
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
                    onClick={() => rejeitarConvidado(convite.user_id)} 
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
    </div>
  );
}
