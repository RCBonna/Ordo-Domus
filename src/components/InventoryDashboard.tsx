import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Box, AlertTriangle, Clock, TrendingUp, MapPin, 
  PieChart as PieChartIcon, Plus, History, Tag, Trash2, Edit3
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, 
  Tooltip, Bar, Cell, LabelList, PieChart, Pie, Legend 
} from 'recharts';

interface InventoryDashboardProps {
  fullInventory: any[];
  history: any[];
  isConsumivel: (categoria?: string) => boolean;
  formatarTexto: (texto?: any) => string;
}

// Custom Label for Pie Chart
const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props;
  const RADIAN = Math.PI / 180;
  
  const radiusInner = innerRadius + (outerRadius - innerRadius) * 0.5;
  const ix = cx + radiusInner * Math.cos(-midAngle * RADIAN);
  const iy = cy + radiusInner * Math.sin(-midAngle * RADIAN);
  
  const radiusOuter = outerRadius + 30;
  const ex = cx + radiusOuter * Math.cos(-midAngle * RADIAN);
  const ey = cy + radiusOuter * Math.sin(-midAngle * RADIAN);
  
  return (
    <g>
      {percent > 0.05 && (
        <text x={ix} y={iy} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="900">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      )}
      <text x={ex} y={ey} fill="#64748b" textAnchor={ex > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="800">
        {value}
      </text>
    </g>
  );
};

export function InventoryDashboard({ 
  fullInventory, 
  history, 
  isConsumivel, 
  formatarTexto 
}: InventoryDashboardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
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
                <h3 className="text-2xl font-black text-slate-900">{fullInventory.filter(i => (i.quantidade || 0) <= 1 && isConsumivel(i.categoria)).length}</h3>
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
                  margin={{ left: 20, right: 40, top: 0, bottom: 0 }}
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
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={24}>
                    {Object.entries(
                      fullInventory.reduce((acc: any, item: any) => {
                        const comodo = formatarTexto(item.comodo) || 'Outros';
                        acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                        return acc;
                      }, {})
                    ).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                    ))}
                    <LabelList dataKey="total" position="right" style={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} offset={10} />
                  </Bar>
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
              {fullInventory.filter(i => (i.quantidade || 0) <= 1 && isConsumivel(i.categoria)).slice(0, 5).map(item => (
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
              {fullInventory.filter(i => (i.quantidade || 0) <= 1 && isConsumivel(i.categoria)).length === 0 && (
                <p className="text-slate-400 text-center py-4 italic text-sm font-medium">Estoque saudável!</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Ações Recentes
            </h3>
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {history.slice(0, 15).map((item, idx) => {
                  const isConsumo = item.tipo === 'consumo';
                  const isExclusao = item.tipo === 'exclusao';
                  const isAjuste = item.tipo === 'ajuste';

                  const dataFormatada = item.data ? new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  let icon = <Plus className="w-4 h-4 text-emerald-500" />;
                  let bgColor = 'bg-emerald-500/20';
                  let label = `Entrada em ${item.comodo}`;
                  let sign = '+';
                  let textColor = 'text-emerald-500';

                  if (isConsumo) {
                    icon = <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />;
                    bgColor = 'bg-rose-500/20';
                    label = `Saída de ${item.comodo}`;
                    sign = '-';
                    textColor = 'text-rose-500';
                  } else if (isExclusao) {
                    icon = <Trash2 className="w-4 h-4 text-slate-400" />;
                    bgColor = 'bg-slate-500/20';
                    label = `Excluído de ${item.comodo}`;
                    sign = '';
                    textColor = 'text-slate-400';
                  } else if (isAjuste) {
                    icon = <Edit3 className="w-4 h-4 text-amber-500" />;
                    bgColor = 'bg-amber-500/20';
                    label = `Editado em ${item.comodo}`;
                    sign = '';
                    textColor = 'text-amber-500';
                  }

                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                        {icon}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm leading-tight">{item.item}</span>
                          <span className="text-[9px] text-white/30 font-bold">{dataFormatada}</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                          {label}
                        </span>
                      </div>
                      <div className={`${textColor} font-black text-sm`}>
                        {sign}{item.quantidade}
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <p className="text-white/40 text-center py-4 italic text-sm font-medium">Nenhuma atividade recente.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
