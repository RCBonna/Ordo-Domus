export type UnitRole = 'admin' | 'convidado';
export type UnitMemberStatus = 'pendente' | 'aprovado';
export type MovementType = 'entrada' | 'consumo' | 'ajuste' | 'exclusao';

export interface UnitMembership {
  id: string;
  nome: string;
  papel: UnitRole | string;
  status: UnitMemberStatus | string;
}

export interface InventoryItem {
  id: string;
  unidade_id: string;
  nome: string;
  categoria: string | null;
  comodo: string;
  armario: string | null;
  caixa: string | null;
  validade: string | null;
  validade_date?: string | null;
  quantidade: number;
  criado_em?: string;
  deletado_em?: string | null;
  deletado_por?: string | null;
}

export type EditableInventoryItem = Partial<InventoryItem> & {
  id?: string;
  nome?: string;
  categoria?: string | null;
  comodo?: string;
  armario?: string | null;
  caixa?: string | null;
  validade?: string | null;
  quantidade?: number | string;
};

export interface InventoryMovement {
  id?: string;
  unidade_id: string;
  item_id?: string | null;
  item_nome: string;
  categoria?: string | null;
  comodo?: string | null;
  quantidade: number;
  tipo: MovementType;
  user_id?: string | null;
  criado_em?: string;
}

export interface HistoryItem {
  item: string;
  categoria: string;
  comodo: string;
  quantidade: number;
  tipo?: MovementType;
  data?: string;
  armario?: string;
  caixa?: string;
  validade?: string;
  transcricao?: string;
}

export interface DashboardChartDatum {
  name: string;
  total?: number;
  value?: number;
}

export interface DashboardMetrics {
  total_skus: number;
  total_quantity: number;
  critical_stock_count: number;
  expired_count: number;
  urgent_expiry_count: number;
  expiring_soon_count: number;
  today_activity_count: number;
  room_chart: Array<{ name: string; total: number }>;
  category_chart: Array<{ name: string; value: number }>;
  expired_items: InventoryItem[];
  urgent_expiry_items: InventoryItem[];
  expiring_soon_items: InventoryItem[];
  critical_stock_items: InventoryItem[];
  recent_movements: HistoryItem[];
}

export type InventoryExpiryFilter = 'todos' | 'vencidos' | 'vence_7' | 'vence_30' | 'sem_validade' | 'estoque_critico';
export type ShoppingPriority = 'faltando' | 'baixo';

export interface ShoppingListItem {
  id: string;
  nome: string;
  categoria: string | null;
  comodos: string[];
  quantidade: number;
  prioridade: ShoppingPriority;
  totalRegistros: number;
}

export interface InventoryQueryParams {
  unidadeId: string;
  searchTerm?: string;
  categoryFilter?: string;
  roomFilter?: string;
  expiryFilter?: InventoryExpiryFilter;
  page: number;
  pageSize: number;
}

export interface InventoryPageResult {
  items: InventoryItem[];
  total: number;
}

export interface UpsertInventoryParams {
  unidadeId: string;
  nome: string;
  categoria: string;
  comodo: string;
  armario: string;
  caixa: string;
  quantidade: number;
  validade: string;
}

export interface UpsertInventoryResult {
  acao?: 'MERGE' | 'ADD';
  nome?: string;
  categoria?: string;
  comodo?: string;
  armario?: string;
  caixa?: string;
  validade?: string;
}
