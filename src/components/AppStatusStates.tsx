import { Clock, Loader2, MapPin } from 'lucide-react';

interface PendingApprovalStateProps {
  unidadeNome: string;
}

export function AuthLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] dark:text-muted-foreground">Sincronizando Ordo Domus...</p>
    </div>
  );
}

export function UnitSelectionPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 dark:bg-muted">
        <MapPin className="w-12 h-12 text-slate-300 dark:text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-2 dark:text-foreground">Selecione uma Unidade</h2>
      <p className="text-slate-500 max-w-sm dark:text-muted-foreground">Use o seletor no topo da tela para escolher qual inventário deseja gerenciar agora.</p>
    </div>
  );
}

export function PendingApprovalState({ unidadeNome }: PendingApprovalStateProps) {
  return (
    <div className="max-w-lg mx-auto bg-white p-12 rounded-[32px] shadow-sm border border-slate-100 text-center dark:border-border dark:bg-card">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-amber-950/40">
        <Clock className="w-10 h-10 text-amber-500 animate-pulse dark:text-amber-300" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-2 dark:text-foreground">Aguardando Aprovação</h2>
      <p className="text-slate-500 dark:text-muted-foreground">O administrador da unidade <strong>{unidadeNome}</strong> precisa aprovar seu acesso.</p>
    </div>
  );
}
