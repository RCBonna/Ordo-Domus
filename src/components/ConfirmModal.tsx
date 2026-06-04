import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/70"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
            >
              {/* Header Visual */}
              <div className={`h-1.5 w-full ${variant === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-black text-slate-900 dark:text-foreground">{title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-muted-foreground">
                      {message}
                    </p>
                  </div>
                  <button 
                    onClick={onCancel}
                    className="p-1 text-slate-300 transition-colors hover:text-rose-500 dark:text-muted-foreground dark:hover:text-rose-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="rounded-xl border border-slate-100 font-bold text-slate-500 hover:bg-slate-50 dark:border-border dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={() => {
                      onConfirm();
                      onCancel();
                    }}
                    className={`rounded-xl px-6 font-black shadow-lg ${
                      variant === 'danger' 
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 dark:shadow-none'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 dark:shadow-none'
                    }`}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
