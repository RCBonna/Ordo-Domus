import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, ChevronRight, Table as TableIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { InventoryCard } from './InventoryCard';
import { formatarTexto } from '@/src/lib/utils';

interface InventoryListProps {
  inventory: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isConsumoMode: boolean;
  editingItemId: string | null;
  editingItemData: any;
  onEdit: (item: any) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onConsume: (item: any) => void;
  setEditingItemData: (data: any) => void;
}

export function InventoryList({
  inventory,
  searchTerm,
  setSearchTerm,
  isConsumoMode,
  editingItemId,
  editingItemData,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onConsume,
  setEditingItemData
}: InventoryListProps) {
  
  const filteredInventory = inventory.filter(item => 
    item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.comodo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por cômodo
  const groupedInventory = filteredInventory.reduce((acc: any, item: any) => {
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
        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
          <TableIcon className="w-4 h-4" />
          {filteredInventory.length} itens encontrados
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-slate-400 font-medium">Tente ajustar sua busca ou adicione novos itens.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedInventory).map(([comodo, itens]: [string, any]) => (
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
                  {itens.map((item: any) => (
                    <InventoryCard 
                      key={item.id}
                      item={item}
                      isEditing={editingItemId === item.id}
                      isConsumoMode={isConsumoMode}
                      editingItemData={editingItemData}
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
    </motion.div>
  );
}
