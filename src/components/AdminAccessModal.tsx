import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import AdminPanel from './AdminPanel';
import { UnitSettingsPanel } from './UnitSettingsPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UnitMembership } from '../types/domain';
import type { ResolvedTheme, ThemePreference } from '../hooks/useThemePreference';

interface AdminAccessModalProps {
  isOpen: boolean;
  unidadeAtiva: UnitMembership | null;
  onClose: () => void;
  onUnitUpdated: (unit: { id: string; nome: string }) => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemePreferenceChange: (preference: ThemePreference) => void;
}

export function AdminAccessModal({
  isOpen,
  unidadeAtiva,
  onClose,
  onUnitUpdated,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: AdminAccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && unidadeAtiva && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
          >
            <div className="absolute top-8 right-8 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full dark:text-muted-foreground dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-10 p-6 pr-8 sm:p-10 sm:pr-12">
                <UnitSettingsPanel
                  unidadeId={unidadeAtiva.id}
                  unidadeNome={unidadeAtiva.nome}
                  papel={unidadeAtiva.papel}
                  onUnitUpdated={onUnitUpdated}
                  themePreference={themePreference}
                  resolvedTheme={resolvedTheme}
                  onThemePreferenceChange={onThemePreferenceChange}
                />
                <div className="h-px bg-slate-100 dark:bg-border" />
                <AdminPanel unidadeId={unidadeAtiva.id} papel={unidadeAtiva.papel} unidadeNome={unidadeAtiva.nome} />
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
