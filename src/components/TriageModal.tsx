import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2, Edit2, Loader2, Package, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTriage, TriageItem } from '../hooks/useTriage';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidadeId: string | undefined;
  onReviewItem: (item: TriageItem) => void;
}

export function TriageModal({ isOpen, onClose, unidadeId, onReviewItem }: TriageModalProps) {
  const { pendingItems, isLoading, discardItem, fetchPendingItems } = useTriage(unidadeId);

  useEffect(() => {
    if (isOpen) {
      fetchPendingItems();
    }
  }, [isOpen, fetchPendingItems]);

  if (!isOpen) return null;

  const matchedCount = pendingItems.filter(i => i.dictMatch).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Triagem de Cupom Fiscal
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Revise os itens extraídos antes de adicioná-los ao inventário.
              {matchedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  {matchedCount} {matchedCount === 1 ? 'item reconhecido' : 'itens reconhecidos'} automaticamente
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-6 bg-gray-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>Carregando itens pendentes...</p>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum item pendente para triagem.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow ${
                    item.dictMatch 
                      ? 'border-emerald-200 ring-1 ring-emerald-100' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold text-gray-900">{item.nome_bruto}</h3>
                      {item.dictMatch && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-bold shrink-0">
                          <Sparkles className="w-3 h-3 mr-0.5" />
                          Smart Match
                        </Badge>
                      )}
                    </div>

                    {/* Smart Match Preview */}
                    {item.dictMatch && (
                      <div className="mt-2 flex items-center gap-2 text-xs bg-emerald-50/60 rounded-lg px-3 py-1.5">
                        <span className="text-gray-400 line-through truncate max-w-[120px]">{item.nome_bruto}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-bold text-emerald-700 truncate">{item.dictMatch.nome_oficial_inventario}</span>
                        {item.dictMatch.categoria && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-600 border-none font-bold">
                            {item.dictMatch.categoria}
                          </Badge>
                        )}
                        {item.dictMatch.comodo && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-indigo-50 text-indigo-500 border-none font-bold">
                            {item.dictMatch.comodo}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        Qtd: <strong className="text-gray-700">{item.quantidade}</strong>
                      </span>
                      {item.valor_unitario && (
                        <span className="flex items-center gap-1">
                          Valor: <strong className="text-gray-700">R$ {item.valor_unitario}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100 sm:pt-0 sm:border-0 sm:pl-4">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => discardItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                      Descartar
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className={`flex-1 sm:flex-none gap-2 ${item.dictMatch ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} 
                      onClick={() => onReviewItem(item)}
                    >
                      {item.dictMatch ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Salvar Direto
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Revisar & Salvar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </div>
  );
}
