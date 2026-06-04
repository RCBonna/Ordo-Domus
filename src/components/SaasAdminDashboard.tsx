import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Building,
  CheckCircle2,
  Filter,
  Loader2,
  Package,
  Power,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';

interface SaasMetrics {
  total_unidades: number;
  total_usuarios_ativos: number;
  total_usuarios_inativos: number;
  total_itens: number;
  total_convites_pendentes: number;
}

interface UnitMember {
  user_id: string;
  email: string | null;
  papel: string;
  status: string;
  adicionado_em: string;
}

interface UnitDetail {
  id: string;
  nome: string;
  criado_em: string;
  total_itens: number;
  membros: UnitMember[];
}

interface UserUnit {
  unidade_id: string;
  unidade_nome: string;
  papel: string;
  status: string;
  adicionado_em: string;
}

interface PlatformUser {
  user_id: string;
  email: string;
  unidades: UserUnit[];
}

interface InventoryItem {
  id: string;
  unidade_id: string;
  unidade_nome: string;
  nome: string;
  categoria: string | null;
  comodo: string | null;
  armario: string | null;
  caixa: string | null;
  validade: string | null;
  quantidade: number | string | null;
  criado_em: string;
}

interface PendingInvite {
  unidade_id: string;
  unidade_nome: string;
  user_id: string;
  email: string;
  papel: string;
  status: string;
  adicionado_em: string;
}

interface SaasSnapshot {
  metrics: SaasMetrics;
  unidades: UnitDetail[];
  usuarios_ativos: PlatformUser[];
  usuarios_inativos: PlatformUser[];
  itens: InventoryItem[];
  convites_pendentes: PendingInvite[];
}

type ActiveModal = 'units' | 'active-users' | 'inactive-users' | 'inventory' | 'invites' | null;

const emptySnapshot: SaasSnapshot = {
  metrics: {
    total_unidades: 0,
    total_usuarios_ativos: 0,
    total_usuarios_inativos: 0,
    total_itens: 0,
    total_convites_pendentes: 0,
  },
  unidades: [],
  usuarios_ativos: [],
  usuarios_inativos: [],
  itens: [],
  convites_pendentes: [],
};

export function SaasAdminDashboard() {
  const [snapshot, setSnapshot] = useState<SaasSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [inventoryUnitFilter, setInventoryUnitFilter] = useState('all');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');

  const fetchSnapshot = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_saas_admin_snapshot');

    if (!error && data) {
      setSnapshot(data as SaasSnapshot);
    } else {
      logger.warn('Falha ao buscar snapshot SaaS.');
      setSnapshot(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const metrics = snapshot?.metrics ?? emptySnapshot.metrics;

  const categories = useMemo(() => {
    const values = new Set<string>();
    snapshot?.itens.forEach((item) => {
      const category = item.categoria?.trim();
      if (category) values.add(category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [snapshot?.itens]);

  const filteredItems = useMemo(() => {
    const search = inventorySearch.trim().toLowerCase();

    return (snapshot?.itens ?? []).filter((item) => {
      const matchesUnit = inventoryUnitFilter === 'all' || item.unidade_id === inventoryUnitFilter;
      const matchesCategory = inventoryCategoryFilter === 'all' || item.categoria === inventoryCategoryFilter;
      const matchesSearch = !search
        || item.nome.toLowerCase().includes(search)
        || item.unidade_nome.toLowerCase().includes(search)
        || item.comodo?.toLowerCase().includes(search);

      return matchesUnit && matchesCategory && matchesSearch;
    });
  }, [inventoryCategoryFilter, inventorySearch, inventoryUnitFilter, snapshot?.itens]);

  const setUserActive = async (user: PlatformUser, active: boolean) => {
    const actionKey = `${user.user_id}:${active ? 'active' : 'inactive'}`;
    setActionLoadingKey(actionKey);

    const { error } = await supabase.rpc('set_saas_user_active', {
      p_user_id: user.user_id,
      p_active: active,
    });

    if (error) {
      logger.warn('Falha ao alterar status global do usuario.');
    } else {
      await fetchSnapshot();
    }

    setActionLoadingKey(null);
  };

  const approveInvite = async (invite: PendingInvite) => {
    const actionKey = `${invite.unidade_id}:${invite.user_id}:approve`;
    setActionLoadingKey(actionKey);

    const { error } = await supabase.rpc('aprovar_convite_saas', {
      p_unidade_id: invite.unidade_id,
      p_user_id: invite.user_id,
    });

    if (error) {
      logger.warn('Falha ao aprovar convite SaaS.');
    } else {
      await fetchSnapshot();
    }

    setActionLoadingKey(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-muted-foreground">Carregando métricas globais...</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500 dark:text-muted-foreground">Não foi possível carregar o painel. Verifique se você é um Super-Admin.</p>
        <Button onClick={fetchSnapshot} className="mt-4">Tentar novamente</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-foreground">SaaS Admin Dashboard</h2>
          <p className="font-medium text-slate-500 dark:text-muted-foreground">Visão global da plataforma Ordo Domus</p>
        </div>
        <Button onClick={fetchSnapshot} variant="outline" className="h-10 gap-2 rounded-2xl">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricButton
          icon={<Building className="h-8 w-8 text-blue-500" />}
          label="Unidades"
          value={metrics.total_unidades}
          tone="blue"
          onClick={() => setActiveModal('units')}
        />
        <MetricButton
          icon={<Users className="h-8 w-8 text-emerald-500" />}
          label="Usuários ativos"
          value={metrics.total_usuarios_ativos}
          tone="emerald"
          onClick={() => setActiveModal('active-users')}
        />
        <MetricButton
          icon={<Power className="h-8 w-8 text-rose-500" />}
          label="Usuários inativos"
          value={metrics.total_usuarios_inativos}
          tone="rose"
          onClick={() => setActiveModal('inactive-users')}
        />
        <MetricButton
          icon={<Package className="h-8 w-8 text-indigo-500" />}
          label="Itens inventário"
          value={metrics.total_itens}
          tone="indigo"
          onClick={() => setActiveModal('inventory')}
        />
        <MetricButton
          icon={<UserPlus className="h-8 w-8 text-amber-500" />}
          label="Convites pendentes"
          value={metrics.total_convites_pendentes}
          tone="amber"
          onClick={() => setActiveModal('invites')}
        />
      </div>

      <DashboardModal
        isOpen={activeModal === 'units'}
        title="Unidades"
        subtitle="Administradores e usuários por unidade"
        onClose={() => setActiveModal(null)}
      >
        <div className="space-y-4">
          {snapshot.unidades.map((unit) => (
            <div key={unit.id} className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-foreground">{unit.nome}</h3>
                  <p className="font-mono text-xs font-bold text-slate-400 dark:text-muted-foreground">{unit.id}</p>
                </div>
                <Badge variant="secondary" className="w-fit">{unit.total_itens} itens</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {unit.membros.map((member) => (
                  <MemberRow key={`${unit.id}:${member.user_id}`} member={member} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardModal>

      <DashboardModal
        isOpen={activeModal === 'active-users'}
        title="Usuários ativos"
        subtitle="Usuários aprovados em pelo menos uma unidade"
        onClose={() => setActiveModal(null)}
      >
        <UserList
          users={snapshot.usuarios_ativos}
          emptyText="Nenhum usuário ativo encontrado."
          actionLabel="Tornar inativo"
          actionIcon={<Power className="h-4 w-4" />}
          actionLoadingKey={actionLoadingKey}
          onAction={(user) => setUserActive(user, false)}
          actionKeySuffix="inactive"
        />
      </DashboardModal>

      <DashboardModal
        isOpen={activeModal === 'inactive-users'}
        title="Usuários inativos"
        subtitle="Usuários bloqueados dentro do app"
        onClose={() => setActiveModal(null)}
      >
        <UserList
          users={snapshot.usuarios_inativos}
          emptyText="Nenhum usuário inativo encontrado."
          actionLabel="Ativar"
          actionIcon={<UserCheck className="h-4 w-4" />}
          actionLoadingKey={actionLoadingKey}
          onAction={(user) => setUserActive(user, true)}
          actionKeySuffix="active"
        />
      </DashboardModal>

      <DashboardModal
        isOpen={activeModal === 'inventory'}
        title="Itens inventário"
        subtitle="Lista global com filtros por unidade e categoria"
        onClose={() => setActiveModal(null)}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-300 dark:text-muted-foreground" />
            <Input
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
              placeholder="Buscar item, unidade ou cômodo..."
              className="h-10 rounded-2xl bg-white pl-9 dark:bg-card"
            />
          </div>
          <SelectFilter
            value={inventoryUnitFilter}
            onChange={setInventoryUnitFilter}
            options={[
              { value: 'all', label: 'Todas as unidades' },
              ...snapshot.unidades.map((unit) => ({ value: unit.id, label: unit.nome })),
            ]}
          />
          <SelectFilter
            value={inventoryCategoryFilter}
            onChange={setInventoryCategoryFilter}
            options={[
              { value: 'all', label: 'Todas as categorias' },
              ...categories.map((category) => ({ value: category, label: category })),
            ]}
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-border">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_90px] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-muted dark:text-muted-foreground">
            <span>Item</span>
            <span>Unidade</span>
            <span>Categoria/local</span>
            <span className="text-right">Qtd.</span>
          </div>
          <div className="max-h-[52vh] overflow-y-auto">
            {filteredItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1.5fr_1fr_1fr_90px] gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-border">
                <div>
                  <p className="font-black text-slate-800 dark:text-foreground">{item.nome}</p>
                  <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">{item.validade || 'Sem validade'}</p>
                </div>
                <p className="font-bold text-slate-600 dark:text-muted-foreground">{item.unidade_nome}</p>
                <p className="font-bold text-slate-500 dark:text-muted-foreground">{item.categoria || 'Geral'} - {item.comodo || 'Sem local'}</p>
                <p className="text-right font-black text-slate-800 dark:text-foreground">{Number(item.quantidade || 0)}</p>
              </div>
            ))}
            {filteredItems.length === 0 && <EmptyState text="Nenhum item encontrado para os filtros atuais." />}
          </div>
        </div>
      </DashboardModal>

      <DashboardModal
        isOpen={activeModal === 'invites'}
        title="Convites pendentes"
        subtitle="Solicitações de entrada aguardando aprovação"
        onClose={() => setActiveModal(null)}
      >
        <div className="space-y-3">
          {snapshot.convites_pendentes.map((invite) => {
            const loadingKey = `${invite.unidade_id}:${invite.user_id}:approve`;
            return (
              <div key={`${invite.unidade_id}:${invite.user_id}`} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
                <div>
                  <p className="font-black text-slate-800 dark:text-foreground">{invite.email}</p>
                  <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">{invite.unidade_nome} - {formatDate(invite.adicionado_em)}</p>
                </div>
                <Button
                  onClick={() => approveInvite(invite)}
                  disabled={actionLoadingKey === loadingKey}
                  className="h-10 gap-2 rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                >
                  {actionLoadingKey === loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aceitar
                </Button>
              </div>
            );
          })}
          {snapshot.convites_pendentes.length === 0 && <EmptyState text="Nenhum convite pendente." />}
        </div>
      </DashboardModal>
    </motion.div>
  );
}

function MetricButton({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'blue' | 'emerald' | 'rose' | 'indigo' | 'amber';
  onClick: () => void;
}) {
  const toneClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40',
    rose: 'bg-rose-50 dark:bg-rose-950/40',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40',
    amber: 'bg-amber-50 dark:bg-amber-950/40',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[156px] flex-col items-start gap-2 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 dark:border-border dark:bg-card dark:shadow-none dark:hover:border-muted-foreground/30 dark:focus-visible:ring-primary/25"
    >
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full transition-transform duration-500 group-hover:scale-110 ${toneClasses[tone]}`} />
      <div className="relative z-10">{icon}</div>
      <p className="relative z-10 mt-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="relative z-10 text-4xl font-black text-slate-800 dark:text-foreground">{value}</p>
    </button>
  );
}

function DashboardModal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/70"
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-border">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-foreground">{title}</h2>
                <p className="text-sm font-bold text-slate-400 dark:text-muted-foreground">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto bg-slate-50/50 p-6 dark:bg-background/40">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MemberRow({ member }: { member: UnitMember }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-border dark:bg-muted/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-black text-slate-700 dark:text-foreground">{member.email || member.user_id}</p>
        <StatusBadge status={member.status} />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-muted-foreground">
        <span>{member.papel}</span>
        <span>{formatDate(member.adicionado_em)}</span>
      </div>
    </div>
  );
}

function UserList({
  users,
  emptyText,
  actionLabel,
  actionIcon,
  actionLoadingKey,
  actionKeySuffix,
  onAction,
}: {
  users: PlatformUser[];
  emptyText: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
  actionLoadingKey: string | null;
  actionKeySuffix: string;
  onAction: (user: PlatformUser) => void;
}) {
  if (users.length === 0) return <EmptyState text={emptyText} />;

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const loadingKey = `${user.user_id}:${actionKeySuffix}`;
        return (
          <div key={user.user_id} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-border dark:bg-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-slate-800 dark:text-foreground">{user.email}</p>
                <p className="font-mono text-xs font-bold text-slate-400 dark:text-muted-foreground">{user.user_id}</p>
              </div>
              <Button
                onClick={() => onAction(user)}
                disabled={actionLoadingKey === loadingKey}
                variant={actionKeySuffix === 'inactive' ? 'destructive' : 'default'}
                className="h-10 gap-2 rounded-2xl font-black"
              >
                {actionLoadingKey === loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : actionIcon}
                {actionLabel}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.unidades.map((unit) => (
                <Badge key={`${user.user_id}:${unit.unidade_id}`} variant="secondary" className="h-auto rounded-xl py-1">
                  {unit.unidade_nome} - {unit.papel}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative block">
      <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-300 dark:text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-2xl border border-input bg-white pl-9 pr-3 text-sm font-bold text-slate-600 outline-none transition-colors focus:border-ring focus:ring-4 focus:ring-ring/20 dark:bg-card dark:text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'aprovado') return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ativo</Badge>;
  if (status === 'inativo') return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">inativo</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">pendente</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}
