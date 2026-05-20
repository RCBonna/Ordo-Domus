import { motion } from 'motion/react';
import { Package, Share2, LogOut, ArrowRight, BarChart2, Table as TableIcon, Box, ShoppingCart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnitMembership } from '../types/domain';

export type AppTab = 'entrada' | 'inventário' | 'consumo' | 'dashboard' | 'saas-admin';

interface MainHeaderProps {
  unidades: UnitMembership[];
  unidadeAtiva: UnitMembership | null;
  setUnidadeAtiva: (unidade: UnitMembership | null) => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendentesCount: number;
  onOpenAdminModal: () => void;
  onSignOut: () => void;
  currentUserEmail: string | null;
  isConsumoMode: boolean;
  setIsConsumoMode: (val: boolean) => void;
  isSistemaLiberado: boolean;
  isSystemAdmin: boolean;
}

export function MainHeader({
  unidades,
  unidadeAtiva,
  setUnidadeAtiva,
  activeTab,
  setActiveTab,
  pendentesCount,
  onOpenAdminModal,
  onSignOut,
  currentUserEmail,
  isConsumoMode,
  setIsConsumoMode,
  isSistemaLiberado,
  isSystemAdmin
}: MainHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-2xl border-b border-slate-200/50 px-4 py-3 sm:px-8 sm:py-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Lado Esquerdo: Logo e Seletor */}
        <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-1 leading-none">
                ORDO <span className="text-primary">DOMUS</span>
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Smart Home Inventory</p>
              
              {/* Seletor de Unidade Compacto (Abaixo do Nome se não selecionada) */}
              {!unidadeAtiva && unidades.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {unidades.map(u => (
                    <button
                      key={u.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnidadeAtiva(u);
                      }}
                      className="px-3 py-1.5 bg-white/50 hover:bg-primary/5 border border-slate-200 hover:border-primary/30 rounded-xl text-[9px] font-black text-slate-500 hover:text-primary transition-all uppercase tracking-widest shadow-sm"
                    >
                      {u.nome}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
          
          {unidadeAtiva && (
            <>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div className="flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none ml-1">Unidade Ativa</p>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 group transition-all hover:border-primary/20 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="font-bold text-sm text-slate-700">{unidadeAtiva.nome}</span>
                  {unidades.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnidadeAtiva(null);
                      }}
                      className="ml-2 p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
                      title="Trocar unidade"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lado Direito: User e Ações */}
        {currentUserEmail && (
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              {/* Botão de Compartilhar / Admin */}
              {unidadeAtiva && unidadeAtiva.papel === 'admin' && (
                <Button
                  onClick={onOpenAdminModal}
                  variant="outline"
                  size="icon"
                  title="Gerenciar acessos e compartilhar"
                  className="relative w-11 h-11 rounded-2xl border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <Share2 className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                  {pendentesCount > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                    >
                      {pendentesCount}
                    </motion.div>
                  )}
                </Button>
              )}

              <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" />

              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuário</p>
                <p className="text-sm font-bold text-slate-700 max-w-[150px] truncate">{currentUserEmail}</p>
              </div>

              {isSystemAdmin && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  title="SaaS Admin (Métricas Globais)"
                  className="relative w-11 h-11 rounded-2xl border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                  onClick={() => setActiveTab('saas-admin')}
                >
                  <BarChart2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                title="Sair do sistema"
                className="w-11 h-11 rounded-2xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-colors"
                onClick={onSignOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs de Navegação - Só aparece se tiver unidade ativa */}
      {unidadeAtiva && isSistemaLiberado && (
        <div className="max-w-7xl mx-auto mt-4 sm:mt-6 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-100/50 w-fit rounded-[20px] border border-slate-200/30">
            <button 
              onClick={() => {
                setActiveTab('entrada');
                setIsConsumoMode(false);
              }}
              title="Adicionar novos itens ao estoque"
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${activeTab === 'entrada' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Box className="w-4 h-4" /> ENTRADA
            </button>
            <button 
              onClick={() => {
                setActiveTab('inventário');
                setIsConsumoMode(false);
              }}
              title="Ver e editar lista de produtos"
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${activeTab === 'inventário' && !isConsumoMode ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <TableIcon className="w-4 h-4" /> INVENTÁRIO
            </button>
            <button 
              onClick={() => {
                setActiveTab('inventário');
                setIsConsumoMode(true);
              }}
              title="Registrar saída e consumo de itens"
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${activeTab === 'inventário' && isConsumoMode ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShoppingCart className="w-4 h-4" /> CONSUMO
            </button>
            <button 
              onClick={() => {
                setActiveTab('dashboard');
                setIsConsumoMode(false);
              }}
              title="Ver estatísticas e histórico de movimentações"
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart2 className="w-4 h-4" /> DASHBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
