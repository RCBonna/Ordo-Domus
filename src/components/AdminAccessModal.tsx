import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import AdminPanel from './AdminPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UnitMembership } from '../types/domain';

interface AdminAccessModalProps {
  isOpen: boolean;
  unidadeAtiva: UnitMembership | null;
  onClose: () => void;
}

export function AdminAccessModal({ isOpen, unidadeAtiva, onClose }: AdminAccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && unidadeAtiva && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="absolute top-8 right-8 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="max-h-[85vh]">
              <div className="p-10">
                <AdminPanel unidadeId={unidadeAtiva.id} papel={unidadeAtiva.papel} unidadeNome={unidadeAtiva.nome} />
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
