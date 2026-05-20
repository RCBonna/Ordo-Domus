import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'motion/react';
import { Loader2, Users, Building, Package, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '../lib/logger';

interface SaasMetrics {
  total_unidades: number;
  total_usuarios: number;
  total_itens: number;
  total_convites_pendentes: number;
}

export function SaasAdminDashboard() {
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_saas_metrics');
    if (!error && data) {
      setMetrics(data);
    } else {
      logger.warn('Falha ao buscar metricas SaaS.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Carregando Métricas Globais...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Não foi possível carregar as métricas. Verifique se você é um Super-Admin.</p>
        <Button onClick={fetchMetrics} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Admin Dashboard</h2>
        <p className="text-slate-500 font-medium">Visão global da plataforma Ordo Domus</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Unidades */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <Building className="w-8 h-8 text-blue-500 relative z-10" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Unidades Ativas</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metrics.total_unidades}</p>
        </div>

        {/* Usuários */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <Users className="w-8 h-8 text-emerald-500 relative z-10" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Usuários Ativos</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metrics.total_usuarios}</p>
        </div>

        {/* Itens */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <Package className="w-8 h-8 text-purple-500 relative z-10" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Itens Inventariados</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metrics.total_itens}</p>
        </div>

        {/* Convites */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <UserPlus className="w-8 h-8 text-amber-500 relative z-10" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Convites Pendentes</p>
          <p className="text-4xl font-black text-slate-800 relative z-10">{metrics.total_convites_pendentes}</p>
        </div>
      </div>
    </motion.div>
  );
}
