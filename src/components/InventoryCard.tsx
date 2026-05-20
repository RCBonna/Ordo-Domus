import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { 
  Edit2, Trash2, X, Save, Box, MinusCircle, 
  Layers, Archive, AlertTriangle, Clock, Calendar 
} from 'lucide-react';
import type { EditableInventoryItem, InventoryItem } from '../types/domain';

interface InventoryCardProps {
  item: InventoryItem;
  isEditing: boolean;
  isConsumoMode: boolean;
  editingItemData: EditableInventoryItem | null;
  onEdit: (item: InventoryItem) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onConsume: (item: InventoryItem) => void;
  setEditingItemData: (data: EditableInventoryItem) => void;
}

export function InventoryCard({
  item,
  isEditing,
  isConsumoMode,
  editingItemData,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onConsume,
  setEditingItemData
}: InventoryCardProps) {
  let diffDays: number | null = null;
  if (item.validade) {
    const parts = item.validade.split('/');
    let expiryDate;
    if (parts.length === 3) expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    else if (parts.length === 2) expiryDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
    
    if (expiryDate) {
      diffDays = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const isExpired = diffDays !== null && diffDays < 0;
  const isExpiringVerySoon = diffDays !== null && diffDays >= 0 && diffDays <= 7;
  const isExpiringSoon = diffDays !== null && diffDays > 7 && diffDays <= 30;
  const isZeroQuantity = Number(item.quantidade) <= 0;

  let cardStyle = "border-slate-100";
  if (isEditing) {
    cardStyle = "ring-2 ring-primary ring-offset-4 border-slate-100";
  } else if (isExpired) {
    cardStyle = "border-rose-400 ring-4 ring-rose-50 shadow-md shadow-rose-100 bg-rose-50/10";
  } else if (isExpiringVerySoon) {
    cardStyle = "border-orange-400 ring-4 ring-orange-50 shadow-md shadow-orange-100 bg-orange-50/10";
  } else if (isExpiringSoon) {
    cardStyle = "border-amber-300 ring-2 ring-amber-50 bg-amber-50/10";
  }

  return (
    <motion.div 
      layout
      key={item.id} 
      whileHover={isEditing ? {} : { y: -5 }}
      className={`group relative bg-white p-6 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border transition-all cursor-default ${cardStyle}`}
    >
      {/* Ações (Edit/Delete) - visíveis sempre no mobile, e no hover em telas maiores */}
      {!isEditing && !isConsumoMode && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
          <button 
            onClick={() => onEdit(item)}
            className="p-2 bg-slate-100 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-xl transition-colors"
            title="Editar item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(item.id)}
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
              <button onClick={onCancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600">
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
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <button 
                    type="button"
                    onClick={() => setEditingItemData({...editingItemData, quantidade: Math.max(0, (editingItemData.quantidade || 0) - 1)})}
                    className="px-3 py-2 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors font-black"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="0"
                    value={editingItemData.quantidade}
                    onChange={(e) => setEditingItemData({...editingItemData, quantidade: Math.max(0, Number(e.target.value))})}
                    className="w-full py-2 bg-transparent font-bold text-slate-800 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setEditingItemData({...editingItemData, quantidade: (editingItemData.quantidade || 0) + 1})}
                    className="px-3 py-2 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors font-black"
                  >
                    +
                  </button>
                </div>
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

          <Button onClick={onUpdate} className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 mt-2">
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
                    onClick={() => onConsume(item)}
                    className="w-10 h-10 bg-white text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm transition-colors"
                    title="Subtrair 1 unidade"
                  >
                    <MinusCircle className="w-5 h-5" />
                  </motion.button>
                )}
                <motion.div 
                  key={item.quantidade}
                  initial={{ scale: 1.1, backgroundColor: "#fecdd3" }}
                  animate={{
                    scale: 1,
                    backgroundColor: isZeroQuantity ? "#e11d48" : "#0f172a",
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                    isZeroQuantity
                      ? 'text-white ring-4 ring-rose-100 shadow-rose-100'
                      : 'bg-slate-900 text-white'
                  }`}
                  title={isZeroQuantity ? 'Local zerado' : 'Quantidade disponível'}
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
}
