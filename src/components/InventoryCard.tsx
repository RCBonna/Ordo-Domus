import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { 
  Edit2, Trash2, X, Save, Box, MinusCircle, Loader2,
  Layers, Archive, AlertTriangle, Clock, Calendar 
} from 'lucide-react';
import type { EditableInventoryItem, InventoryItem } from '../types/domain';
import { getValidityStatus } from '../lib/utils';

interface InventoryCardProps {
  item: InventoryItem;
  isEditing: boolean;
  isConsumoMode: boolean;
  editingItemData: EditableInventoryItem | null;
  isSaving: boolean;
  isAnyItemSaving: boolean;
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
  isSaving,
  isAnyItemSaving,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onConsume,
  setEditingItemData
}: InventoryCardProps) {
  const validityStatus = getValidityStatus(item.validade_date || item.validade);
  const isExpired = validityStatus?.kind === 'expired';
  const isExpiringVerySoon = validityStatus?.kind === 'next_7';
  const isExpiringSoon = validityStatus?.kind === 'next_30';
  const isZeroQuantity = Number(item.quantidade) <= 0;

  let cardStyle = "border-slate-100 dark:border-border dark:bg-card";
  if (isEditing) {
    cardStyle = "ring-2 ring-primary ring-offset-4 border-slate-100 dark:border-border dark:bg-card dark:ring-offset-background";
  } else if (isExpired) {
    cardStyle = "border-rose-400 ring-4 ring-rose-50 shadow-md shadow-rose-100 bg-rose-50/10 dark:border-rose-800 dark:bg-rose-950/20 dark:ring-rose-950/50 dark:shadow-black/20";
  } else if (isExpiringVerySoon) {
    cardStyle = "border-orange-400 ring-4 ring-orange-50 shadow-md shadow-orange-100 bg-orange-50/10 dark:border-orange-800 dark:bg-orange-950/20 dark:ring-orange-950/50 dark:shadow-black/20";
  } else if (isExpiringSoon) {
    cardStyle = "border-amber-300 ring-2 ring-amber-50 bg-amber-50/10 dark:border-amber-800 dark:bg-amber-950/20 dark:ring-amber-950/50";
  }

  return (
    <motion.div 
      layout
      key={item.id} 
      whileHover={isEditing ? {} : { y: -5 }}
      className={`group relative bg-white p-6 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border transition-all cursor-default dark:hover:shadow-black/30 ${isSaving ? 'pointer-events-auto' : ''} ${cardStyle}`}
    >
      {/* Ações (Edit/Delete) - visíveis sempre no mobile, e no hover em telas maiores */}
      {!isEditing && !isConsumoMode && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
          <button 
            onClick={() => onEdit(item)}
            disabled={isAnyItemSaving}
            className="p-2 bg-slate-100 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-xl transition-colors dark:bg-muted dark:text-muted-foreground dark:hover:bg-accent"
            title="Editar item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(item.id)}
            disabled={isAnyItemSaving}
            className="p-2 bg-slate-100 hover:bg-destructive/10 text-slate-400 hover:text-destructive rounded-xl transition-colors dark:bg-muted dark:text-muted-foreground dark:hover:bg-destructive/15"
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
              <button
                onClick={onCancelEdit}
                disabled={isSaving}
                className="p-1.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground dark:hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <input 
              type="text" 
              disabled={isSaving}
              value={editingItemData.nome || ''}
              onChange={(e) => setEditingItemData({...editingItemData, nome: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted dark:text-foreground"
              placeholder="Nome do item"
            />
            <input 
              type="text" 
              disabled={isSaving}
              value={editingItemData.categoria || ''}
              onChange={(e) => setEditingItemData({...editingItemData, categoria: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-primary/60 uppercase text-[10px] tracking-widest focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted"
              placeholder="Categoria"
            />
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1 dark:text-muted-foreground">Cômodo</p>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={editingItemData.comodo || ''}
                  onChange={(e) => setEditingItemData({...editingItemData, comodo: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted dark:text-foreground"
                  placeholder="Ex: Cozinha"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1 dark:text-muted-foreground">Quantidade</p>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all dark:border-border dark:bg-muted">
                  <button 
                    type="button"
                    disabled={isSaving}
                    onClick={() => setEditingItemData({...editingItemData, quantidade: Math.max(0, (editingItemData.quantidade || 0) - 1)})}
                    className="px-3 py-2 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors font-black disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="0"
                    disabled={isSaving}
                    value={editingItemData.quantidade}
                    onChange={(e) => setEditingItemData({...editingItemData, quantidade: Math.max(0, Number(e.target.value))})}
                    className="w-full py-2 bg-transparent font-bold text-slate-800 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:text-foreground"
                  />
                  <button 
                    type="button"
                    disabled={isSaving}
                    onClick={() => setEditingItemData({...editingItemData, quantidade: (editingItemData.quantidade || 0) + 1})}
                    className="px-3 py-2 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors font-black disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1 dark:text-muted-foreground">Armário/Prateleira</p>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={editingItemData.armario || ''}
                  onChange={(e) => setEditingItemData({...editingItemData, armario: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted dark:text-foreground"
                  placeholder="Local exato"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1 dark:text-muted-foreground">Caixa/Gaveta</p>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={editingItemData.caixa || ''}
                  onChange={(e) => setEditingItemData({...editingItemData, caixa: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted dark:text-foreground"
                  placeholder="Identificador"
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase mb-1 ml-1 dark:text-muted-foreground">Validade</p>
              <input 
                type="text" 
                disabled={isSaving}
                value={editingItemData.validade || ''}
                onChange={(e) => setEditingItemData({...editingItemData, validade: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:border-border dark:bg-muted dark:text-foreground"
                placeholder="Ex: 12/2026"
              />
            </div>
          </div>

          <Button
            onClick={onUpdate}
            disabled={isSaving}
            className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 mt-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors dark:bg-muted">
              <Box className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors dark:text-muted-foreground" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mr-1 dark:text-muted-foreground">QTD</p>
              <div className="flex items-center gap-3">
                {isConsumoMode && (
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: "#fff5f5" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onConsume(item)}
                    disabled={isAnyItemSaving}
                    className="w-10 h-10 bg-white text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:bg-card dark:text-rose-300"
                    title="Subtrair 1 unidade"
                  >
                    <MinusCircle className="w-5 h-5" />
                  </motion.button>
                )}
                <motion.div 
                  key={item.quantidade}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                    isZeroQuantity
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-rose-100 dark:bg-rose-500 dark:text-white dark:ring-rose-950/60 dark:shadow-black/20'
                      : 'bg-sky-100 text-sky-950 ring-1 ring-sky-200 shadow-sky-100 dark:bg-sky-300 dark:text-slate-950 dark:ring-sky-200 dark:shadow-black/20'
                  }`}
                  title={isZeroQuantity ? 'Local zerado' : 'Quantidade disponível'}
                >
                  {item.quantidade}
                </motion.div>
              </div>
            </div>
          </div>
          
          <div className="space-y-1 mb-4">
            <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors dark:text-foreground">{item.nome}</h3>
            <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">{item.categoria || 'Sem Categoria'}</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-border">
            <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
              <Layers className="w-3.5 h-3.5 opacity-40" />
              <span className="text-xs font-bold">{item.armario || 'Local não especificado'}</span>
            </div>
            {item.caixa && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
                <Archive className="w-3.5 h-3.5 opacity-40" />
                <span className="text-xs font-bold">{item.caixa}</span>
              </div>
            )}
            {item.validade && (
              (() => {
                if (!validityStatus) return null;
                
                if (validityStatus.kind === 'expired') {
                  const overdueDays = Math.abs(validityStatus.daysUntil);
                  return (
                    <div className="flex items-center gap-2 text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        Ja venceu: {item.validade} ({overdueDays}d atras)
                      </span>
                    </div>
                  );
                } else if (validityStatus.kind === 'next_7') {
                  return (
                    <div className="flex items-center gap-2 text-orange-700 bg-orange-50 p-2 rounded-xl border border-orange-200 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        Vence nos proximos 7 dias: {item.validade} ({validityStatus.daysUntil}d)
                      </span>
                    </div>
                  );
                } else if (validityStatus.kind === 'next_30') {
                  return (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        Vence nos proximos 30 dias: {item.validade} ({validityStatus.daysUntil}d)
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100/50 opacity-60 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
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
