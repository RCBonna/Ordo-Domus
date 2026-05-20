import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Box, AlertTriangle, Clock, TrendingUp, MapPin, 
  PieChart as PieChartIcon, Plus, History, Tag, Trash2, Edit3,
  Calendar, ArrowRight, Package, ShoppingCart, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, 
  Tooltip, Bar, Cell, LabelList, PieChart, Pie, Legend 
} from 'recharts';
import type { DashboardMetrics, HistoryItem, InventoryItem } from '../types/domain';

interface InventoryDashboardProps {
  fullInventory: InventoryItem[];
  history: HistoryItem[];
  dashboardMetrics?: DashboardMetrics | null;
  isDashboardMetricsLoading?: boolean;
  isConsumivel: (categoria?: string) => boolean;
  formatarTexto: (texto?: unknown) => string;
  onNavigateToItem?: (itemName: string) => void;
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  value: string | number;
}

// Custom Label for Pie Chart with better visibility
const renderPieLabel = (props: Partial<PieLabelProps>) => {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
    value = '',
  } = props;
  const RADIAN = Math.PI / 180;
  
  const radiusInner = innerRadius + (outerRadius - innerRadius) * 0.5;
  const ix = cx + radiusInner * Math.cos(-midAngle * RADIAN);
  const iy = cy + radiusInner * Math.sin(-midAngle * RADIAN);
  
  const radiusOuter = outerRadius + 25;
  const ex = cx + radiusOuter * Math.cos(-midAngle * RADIAN);
  const ey = cy + radiusOuter * Math.sin(-midAngle * RADIAN);
  
  return (
    <g>
      {percent > 0.05 && (
        <text x={ix} y={iy} fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth={3} paintOrder="stroke" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="900">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      )}
      <text x={ex} y={ey} fill="#64748b" textAnchor={ex > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="700">
        {value}
      </text>
    </g>
  );
};

export function InventoryDashboard({ 
  fullInventory, 
  history, 
  dashboardMetrics,
  isDashboardMetricsLoading = false,
  isConsumivel, 
  formatarTexto,
  onNavigateToItem
}: InventoryDashboardProps) {
  
  // Helpers for Expiry
  const getDaysUntilExpiry = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    let expiryDate;
    if (parts.length === 3) {
      expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else if (parts.length === 2) {
      expiryDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
    } else {
      return null;
    }
    const diffTime = expiryDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const allExpiryItems = useMemo(() => fullInventory
    .filter(item => getDaysUntilExpiry(item.validade || '') !== null)
    .sort((a, b) => (getDaysUntilExpiry(a.validade || '') || 999) - (getDaysUntilExpiry(b.validade || '') || 999)), [fullInventory]);

  const expiredItems = useMemo(() => allExpiryItems.filter(item => (getDaysUntilExpiry(item.validade || '') as number) < 0), [allExpiryItems]);
  const visibleExpiredItems = dashboardMetrics?.expired_items ?? expiredItems;

  const urgentExpiryItems = useMemo(() => allExpiryItems.filter(item => {
    const d = getDaysUntilExpiry(item.validade || '') as number;
    return d >= 0 && d <= 7;
  }), [allExpiryItems]);
  const visibleUrgentExpiryItems = dashboardMetrics?.urgent_expiry_items ?? urgentExpiryItems;

  const expiringSoon = useMemo(() => allExpiryItems.filter(item => {
    const d = getDaysUntilExpiry(item.validade || '') as number;
    return d > 7 && d <= 30;
  }), [allExpiryItems]);
  const visibleExpiringSoon = dashboardMetrics?.expiring_soon_items ?? expiringSoon;

  const criticalStockAll = useMemo(() => fullInventory
    .filter(i => (Number(i.quantidade) || 0) <= 1 && isConsumivel(i.categoria || undefined)), [fullInventory, isConsumivel]);

  const criticalStock = useMemo(() => dashboardMetrics?.critical_stock_items ?? criticalStockAll.slice(0, 8), [criticalStockAll, dashboardMetrics]);

  const totalItemsCount = useMemo(() => dashboardMetrics?.total_quantity ?? fullInventory.reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0), [dashboardMetrics, fullInventory]);
  const totalSkusCount = dashboardMetrics?.total_skus ?? fullInventory.length;
  const criticalStockCount = dashboardMetrics?.critical_stock_count ?? criticalStockAll.length;
  const expiringThirtyDaysCount = dashboardMetrics
    ? dashboardMetrics.urgent_expiry_count + dashboardMetrics.expiring_soon_count
    : expiringSoon.length + urgentExpiryItems.length;

  const roomChartData = useMemo(() => Object.entries(
    fullInventory.reduce<Record<string, number>>((acc, item) => {
      const comodo = item.comodo || 'Outros';
      acc[comodo] = (acc[comodo] || 0) + (Number(item.quantidade) || 0);
      return acc;
    }, {})
  ).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6), [fullInventory]);
  const visibleRoomChartData = dashboardMetrics?.room_chart ?? roomChartData;

  const categoryChartData = useMemo(() => Object.entries(
    fullInventory.reduce<Record<string, number>>((acc, item) => {
      const cat = item.categoria || 'Geral';
      acc[cat] = (acc[cat] || 0) + (Number(item.quantidade) || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5), [fullInventory]);
  const visibleCategoryChartData = dashboardMetrics?.category_chart ?? categoryChartData;

  const todayActivityCount = useMemo(() => history.filter(h => {
    if (!h.data) return true;
    const d = new Date(h.data);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  }).length, [history]);
  const visibleTodayActivityCount = dashboardMetrics?.today_activity_count ?? todayActivityCount;
  const visibleHistory = dashboardMetrics?.recent_movements ?? history;
  
  const chartColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-10"
    >
      {/* Critical Alert Board */}
      {(visibleExpiredItems.length > 0 || visibleUrgentExpiryItems.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-[24px] p-6 text-white shadow-lg shadow-rose-200 border border-rose-400"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Alerta Crítico de Validade</h2>
              <p className="text-rose-100 font-bold text-sm">Ação imediata necessária para os seguintes itens</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {visibleExpiredItems.map((item, idx) => (
              <div key={`exp-${idx}`} onClick={() => onNavigateToItem?.(item.nome)} className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl p-3 flex items-center justify-between border border-white/10">
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">{item.nome}</span>
                  <span className="text-[10px] font-black uppercase text-rose-200">Vencido</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
            ))}
            {visibleUrgentExpiryItems.map((item, idx) => (
              <div key={`urg-${idx}`} onClick={() => onNavigateToItem?.(item.nome)} className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl p-3 flex items-center justify-between border border-white/10">
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">{item.nome}</span>
                  <span className="text-[10px] font-black uppercase text-orange-200">Vence em {getDaysUntilExpiry(item.validade || '')}d</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total de Itens', 
            value: totalItemsCount, 
            icon: Package, 
            color: 'from-indigo-500 to-blue-600',
            sub: `${totalSkusCount} SKUs cadastrados`
          },
          { 
            label: 'Estoque Crítico', 
            value: criticalStockCount, 
            icon: AlertTriangle, 
            color: 'from-rose-500 to-pink-600',
            sub: 'Abaixo da reserva'
          },
          { 
            label: 'A Vencer (30d)', 
            value: expiringThirtyDaysCount, 
            icon: Clock, 
            color: 'from-amber-500 to-orange-600',
            sub: 'Radar de validade'
          },
          { 
            label: 'Atividade Hoje', 
            value: visibleTodayActivityCount, 
            icon: Zap, 
            color: 'from-emerald-500 to-teal-600',
            sub: isDashboardMetricsLoading ? 'Atualizando...' : 'Movimentações recentes'
          }
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-[24px] bg-white p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{kpi.label}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${kpi.color} text-white shadow-lg shadow-indigo-100`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r opacity-10 from-transparent via-current to-transparent" />
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Charts & Analysis */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden border border-slate-100">
              <div className="p-6 pb-0 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cômodos</h3>
                  <p className="text-xs text-slate-400 font-bold">Distribuição por ambiente</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="h-[280px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={visibleRoomChartData}
                    layout="vertical"
                    margin={{ left: -20, right: 30, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9', radius: 4 }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={18}>
                      {chartColors.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />
                      ))}
                      <LabelList dataKey="total" position="right" style={{ fill: '#94a3b8', fontSize: 12, fontWeight: 900 }} offset={8} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden border border-slate-100">
              <div className="p-6 pb-0 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Mix de Categorias</h3>
                  <p className="text-xs text-slate-400 font-bold">Variedade do inventário</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <PieChartIcon className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="h-[280px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visibleCategoryChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={6}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {chartColors.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Expiry Radar (Radar de Validade) */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  Próximos Vencimentos
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Itens que precisam de atenção</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-black border-amber-100 text-amber-600 bg-amber-50">
                {expiringThirtyDaysCount} alertas
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...visibleUrgentExpiryItems, ...visibleExpiringSoon].slice(0, 6).map((item, idx) => {
                const days = getDaysUntilExpiry(item.validade || '');
                const isUrgent = days !== null && days <= 7;
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => onNavigateToItem?.(item.nome)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-100 text-orange-500' : 'bg-amber-100 text-amber-500'}`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 text-sm truncate group-hover:text-amber-700 transition-colors">{item.nome}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold uppercase">{item.comodo}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className={`text-xs font-black ${isUrgent ? 'text-orange-500' : 'text-amber-500'}`}>
                          {days === 0 ? 'Vence HOJE' : `Em ${days} dias`}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                );
              })}
              {[...visibleUrgentExpiryItems, ...visibleExpiringSoon].length === 0 && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-300">
                  <Clock className="w-12 h-12 mb-2 opacity-20" />
                  <p className="italic text-sm font-bold">Nenhum item vencendo em breve.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Actions */}
        <div className="space-y-8">
          
          {/* Suggested Replenishment */}
          <div className="bg-white border border-indigo-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-indigo-900">
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
              Reposição Sugerida
            </h3>
            <div className="space-y-3">
              {criticalStock.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => onNavigateToItem?.(item.nome)}
                  className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-tight text-slate-700 group-hover:text-indigo-700 transition-colors">{item.nome}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{item.comodo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">
                      {item.quantidade} un
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
              {criticalStock.length === 0 && (
                <div className="text-center py-8 opacity-50 text-indigo-900">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-bold">Tudo em ordem!</p>
                </div>
              )}
              {criticalStockCount > 8 && (
                <p className="text-xs text-center text-slate-400 font-bold uppercase mt-2">
                  + {criticalStockCount - 8} itens críticos
                </p>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col h-[520px]">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 shrink-0">
              <History className="w-4 h-4 text-slate-400" />
              Linha do Tempo
            </h3>
            <div className="flex-1 overflow-y-auto -mr-2 pr-2">
              <div className="space-y-4">
                {visibleHistory.slice(0, 30).map((item, idx) => {
                  const isConsumo = item.tipo === 'consumo';
                  const isExclusao = item.tipo === 'exclusao';
                  const isAjuste = item.tipo === 'ajuste';
                  const isEntrada = item.tipo === 'entrada';

                  let dataFormatada = 'Agora';
                  if (item.data) {
                    const d = new Date(item.data);
                    const today = new Date();
                    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                    dataFormatada = isToday 
                      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  }
                  
                  let colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  let icon = <Plus className="w-3.5 h-3.5" />;
                  let label = `Entrada em ${item.comodo}`;
                  let sign = '+';

                  if (isConsumo) {
                    colorClass = 'bg-rose-50 text-rose-600 border-rose-100';
                    icon = <ArrowRight className="w-3.5 h-3.5 rotate-45" />;
                    label = `Saída de ${item.comodo}`;
                    sign = '-';
                  } else if (isExclusao) {
                    colorClass = 'bg-slate-50 text-slate-500 border-slate-200';
                    icon = <Trash2 className="w-3.5 h-3.5" />;
                    label = `Removido`;
                    sign = '';
                  } else if (isAjuste) {
                    colorClass = 'bg-amber-50 text-amber-600 border-amber-100';
                    icon = <Edit3 className="w-3.5 h-3.5" />;
                    label = `Atualizado`;
                    sign = '';
                  }

                  return (
                    <div key={idx} className="relative pl-6 pb-4 border-l border-slate-100 last:pb-0">
                      <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                        <div className={`w-1 h-1 rounded-full ${colorClass.split(' ')[1].replace('text-', 'bg-')}`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{item.item}</span>
                          <span className="text-xs text-slate-300 font-black">{dataFormatada}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{label}</span>
                          <span className={`text-xs font-black ${colorClass.split(' ')[1]}`}>
                            {sign}{item.quantidade}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {visibleHistory.length === 0 && (
                  <p className="text-slate-300 text-center py-10 italic text-sm font-bold">Sem atividades registradas.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
