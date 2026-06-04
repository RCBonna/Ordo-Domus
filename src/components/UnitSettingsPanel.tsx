import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Building2, Loader2, Monitor, Moon, Save, Settings, ShieldCheck, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';
import type { ResolvedTheme, ThemePreference } from '../hooks/useThemePreference';

interface UpdatedUnit {
  id: string;
  nome: string;
}

interface UnitSettingsPanelProps {
  papel: string;
  unidadeId: string;
  unidadeNome: string;
  onUnitUpdated: (unit: { id: string; nome: string }) => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemePreferenceChange: (preference: ThemePreference) => void;
}

const UNIT_SETTINGS_SAVE_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      onTimeout();
      reject(new Error('Tempo limite excedido.'));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export function UnitSettingsPanel({
  papel,
  unidadeId,
  unidadeNome,
  onUnitUpdated,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: UnitSettingsPanelProps) {
  const [name, setName] = useState(unidadeNome);
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = papel === 'admin';
  const normalizedName = name.trim();
  const hasChanges = normalizedName !== unidadeNome.trim();

  useEffect(() => {
    setName(unidadeNome);
  }, [unidadeNome]);

  const saveSettings = async () => {
    if (!isAdmin || !hasChanges || !normalizedName) return;

    setIsSaving(true);
    const abortController = new AbortController();

    try {
      const { data, error } = await withTimeout(
        supabase
          .rpc('atualizar_configuracao_unidade', {
            p_unidade_id: unidadeId,
            p_nome: normalizedName,
          })
          .abortSignal(abortController.signal)
          .single(),
        UNIT_SETTINGS_SAVE_TIMEOUT_MS,
        () => abortController.abort()
      );

      const updatedUnit = data as UpdatedUnit | null;

      if (error || !updatedUnit) {
        logger.warn('Falha ao atualizar configuracao da unidade.');
        toast.error(error?.message || 'Nao foi possivel atualizar a unidade.');
        return;
      }

      onUnitUpdated({ id: updatedUnit.id, nome: updatedUnit.nome });
      toast.success('Unidade atualizada.');
    } catch {
      logger.warn('Falha ao atualizar configuracao da unidade.');
      toast.error('Nao foi possivel salvar agora. Tente novamente em instantes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">Configuracoes</p>
          <h3 className="text-xl font-black leading-tight text-slate-900">Unidade</h3>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
            Dados basicos, governanca e espaco para preferencias futuras.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-slate-400" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dados basicos</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit-name">Nome da unidade</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="unit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!isAdmin || isSaving}
              maxLength={120}
              className="h-11 rounded-2xl bg-white"
            />
            <Button
              type="button"
              onClick={saveSettings}
              disabled={!isAdmin || !hasChanges || !normalizedName || isSaving}
              className="h-11 gap-2 rounded-2xl px-5 font-black"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <GovernanceTile label="Papel atual" value={papel === 'admin' ? 'Admin' : 'Convidado'} />
        <GovernanceTile label="Identificador" value={unidadeId.slice(0, 8)} />
        <GovernanceTile label="Edicao" value={isAdmin ? 'Liberada' : 'Bloqueada'} />
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-slate-400" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tema</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema visual">
          <ThemePreferenceButton
            icon={<Monitor className="h-4 w-4" />}
            isActive={themePreference === 'system'}
            label="Automático"
            onClick={() => onThemePreferenceChange('system')}
          />
          <ThemePreferenceButton
            icon={<Sun className="h-4 w-4" />}
            isActive={themePreference === 'light'}
            label="Claro"
            onClick={() => onThemePreferenceChange('light')}
          />
          <ThemePreferenceButton
            icon={<Moon className="h-4 w-4" />}
            isActive={themePreference === 'dark'}
            label="Escuro"
            onClick={() => onThemePreferenceChange('dark')}
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Proximas configuracoes</p>
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-500">
          Permissoes por papel, locais padrao, preferencias de convite e politicas da unidade ficam reservadas para evolucoes futuras.
        </p>
      </div>
    </div>
  );
}

function ThemePreferenceButton({
  icon,
  isActive,
  label,
  onClick,
}: {
  icon: ReactNode;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition-all ${
        isActive
          ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10'
          : 'border-slate-100 bg-white text-slate-500 hover:border-primary/20 hover:bg-primary/5 hover:text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GovernanceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
