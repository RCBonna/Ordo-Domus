import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2, Edit2, Loader2, Package } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
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
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.nome_bruto}</h3>
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
                    <Button variant="default" size="sm" className="flex-1 sm:flex-none gap-2" onClick={() => onReviewItem(item)}>
                      <Check className="w-4 h-4" />
                      Revisar & Salvar
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
