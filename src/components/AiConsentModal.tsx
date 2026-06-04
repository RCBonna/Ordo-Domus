import { AnimatePresence, motion } from 'motion/react';
import { Bot, Check, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiConsentRequest } from '../hooks/useAiConsent';

interface AiConsentModalProps {
  request: AiConsentRequest | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function AiConsentModal({ request, onAccept, onDecline }: AiConsentModalProps) {
  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="h-1.5 bg-indigo-500" />
            <div className="p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    Consentimento de IA
                  </p>
                  <h2 className="text-xl font-black text-slate-900">{request.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    {request.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDecline}
                  className="rounded-xl p-1 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Fechar consentimento"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs font-bold leading-relaxed text-slate-600">
                    O envio passa pela Edge Function autenticada do Supabase antes de chegar ao provedor de IA.
                  </p>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs font-bold leading-relaxed text-slate-600">
                    Imagens e áudios brutos não são salvos no banco; apenas os dados extraídos que você confirmar ou importar ficam persistidos.
                  </p>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs font-bold leading-relaxed text-slate-600">
                    Esta escolha fica salva neste navegador para o usuário atual.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDecline}
                  className="rounded-xl border border-slate-100 font-bold text-slate-500 hover:bg-slate-50"
                >
                  Agora não
                </Button>
                <Button
                  type="button"
                  onClick={onAccept}
                  className="gap-2 rounded-xl bg-indigo-600 px-6 font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                >
                  <Check className="h-4 w-4" />
                  Aceitar e continuar
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
