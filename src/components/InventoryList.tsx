import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, ChevronRight, Filter, Table as TableIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InventoryCard } from './InventoryCard';
import { formatarTexto } from '@/src/lib/utils';
import type { EditableInventoryItem, InventoryExpiryFilter, InventoryItem } from '../types/domain';

interface InventoryListProps {
  inventory: InventoryItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (term: string) => void;
  roomFilter: string;
  setRoomFilter: (term: string) => void;
  expiryFilter: InventoryExpiryFilter;
  setExpiryFilter: (filter: InventoryExpiryFilter) => void;
  inventoryPage: number;
  setInventoryPage: (page: number) => void;
  inventoryPageSize: number;
  setInventoryPageSize: (pageSize: number) => void;
  inventoryTotal: number;
  clearInventoryFilters: () => void;
  isInventoryLoading: boolean;
  isConsumoMode: boolean;
  editingItemId: string | null;
  editingItemData: EditableInventoryItem | null;
  savingItemId: string | null;
  onEdit: (item: InventoryItem) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onConsume: (item: InventoryItem) => void;
  setEditingItemData: (data: EditableInventoryItem) => void;
}

export function InventoryList({
  inventory,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  roomFilter,
  setRoomFilter,
  expiryFilter,
  setExpiryFilter,
  inventoryPage,
  setInventoryPage,
  inventoryPageSize,
  setInventoryPageSize,
  inventoryTotal,
  clearInventoryFilters,
  isInventoryLoading,
  isConsumoMode,
  editingItemId,
  editingItemData,
  savingItemId,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onConsume,
  setEditingItemData
}: InventoryListProps) {
  const totalPages = Math.max(1, Math.ceil(inventoryTotal / inventoryPageSize));
  const hasActiveFilters = Boolean(searchTerm || categoryFilter || roomFilter || expiryFilter !== 'todos');
  const firstItem = inventoryTotal === 0 ? 0 : (inventoryPage - 1) * inventoryPageSize + 1;
  const lastItem = Math.min(inventoryPage * inventoryPageSize, inventoryTotal);

  // Agrupar por cômodo
  const groupedInventory = inventory.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const comodo = formatarTexto(item.comodo) || 'Outros';
    if (!acc[comodo]) acc[comodo] = [];
    acc[comodo].push(item);
    return acc;
  }, {});

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar por nome, categoria ou cômodo..."
            className="pl-12 h-14 rounded-[22px] bg-white border-slate-100 shadow-sm focus-visible:ring-primary/20 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm font-bold uppercase tracking-widest">
          <TableIcon className="w-4 h-4 shrink-0" />
          <span>
            {inventoryTotal} itens encontrados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_220px_auto] gap-3 items-center bg-white rounded-[24px] border border-slate-100 shadow-sm p-4">
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filtrar categoria exata..."
            className="pl-11 h-12 rounded-[18px] bg-slate-50 border-slate-100 text-sm font-bold"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filtrar cômodo exato..."
            className="pl-11 h-12 rounded-[18px] bg-slate-50 border-slate-100 text-sm font-bold"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
          />
        </div>
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value as InventoryExpiryFilter)}
          className="h-12 rounded-[18px] bg-slate-50 border border-slate-100 px-4 text-sm font-black text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="todos">Todas validades</option>
          <option value="vencidos">Vencidos</option>
          <option value="vence_7">Vence em 7 dias</option>
          <option value="vence_30">Vence em 30 dias</option>
          <option value="sem_validade">Sem validade</option>
          <option value="estoque_critico">Estoque crítico</option>
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={clearInventoryFilters}
          disabled={!hasActiveFilters}
          className="h-12 rounded-[18px] font-black"
        >
          <X className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>

      {isInventoryLoading && inventory.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-slate-200 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Carregando inventário</h3>
          <p className="text-slate-400 font-medium">Buscando os itens da unidade selecionada.</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-slate-400 font-medium">Tente ajustar sua busca ou adicione novos itens.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedInventory).map(([comodo, itens]) => (
            <div key={comodo} className="space-y-6">
              <div className="flex items-center gap-3 ml-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ChevronRight className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  {comodo}
                  <span className="text-xs font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {itens.length}
                  </span>
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {itens.map((item) => (
                    <InventoryCard 
                      key={item.id}
                      item={item}
                      isEditing={editingItemId === item.id}
                      isConsumoMode={isConsumoMode}
                      editingItemData={editingItemData}
                      isSaving={savingItemId === item.id}
                      isAnyItemSaving={Boolean(savingItemId)}
                      onEdit={onEdit}
                      onCancelEdit={onCancelEdit}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onConsume={onConsume}
                      setEditingItemData={setEditingItemData}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white rounded-[24px] border border-slate-100 shadow-sm p-4">
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {isInventoryLoading ? 'Carregando...' : `Mostrando ${firstItem}-${lastItem} de ${inventoryTotal}`}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={inventoryPageSize}
            onChange={(e) => setInventoryPageSize(Number(e.target.value))}
            className="h-10 rounded-[14px] bg-slate-50 border border-slate-100 px-3 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={12}>12 por página</option>
            <option value={24}>24 por página</option>
            <option value={48}>48 por página</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-[14px]"
            disabled={inventoryPage <= 1 || isInventoryLoading}
            onClick={() => setInventoryPage(Math.max(1, inventoryPage - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-black text-slate-500 min-w-20 text-center">
            {inventoryPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-[14px]"
            disabled={inventoryPage >= totalPages || isInventoryLoading}
            onClick={() => setInventoryPage(Math.min(totalPages, inventoryPage + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
