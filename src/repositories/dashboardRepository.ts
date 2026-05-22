import { supabase } from '../lib/supabaseClient';
import { measureAsync } from '../lib/observability';
import type { DashboardMetrics, HistoryItem, InventoryItem, MovementType } from '../types/domain';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNumber = (value: unknown) => Number(value) || 0;

const asString = (value: unknown) => typeof value === 'string' ? value : '';

const asArray = (value: unknown) => Array.isArray(value) ? value : [];

const toInventoryItem = (value: unknown): InventoryItem => {
  const record = isRecord(value) ? value : {};

  return {
    id: asString(record.id),
    unidade_id: asString(record.unidade_id),
    nome: asString(record.nome),
    categoria: record.categoria === null ? null : asString(record.categoria),
    comodo: asString(record.comodo),
    armario: record.armario === null ? null : asString(record.armario),
    caixa: record.caixa === null ? null : asString(record.caixa),
    validade: record.validade === null ? null : asString(record.validade),
    validade_date: record.validade_date === null ? null : asString(record.validade_date),
    quantidade: asNumber(record.quantidade),
  };
};

const toHistoryItem = (value: unknown): HistoryItem => {
  const record = isRecord(value) ? value : {};
  const tipo = asString(record.tipo);

  return {
    item: asString(record.item),
    categoria: asString(record.categoria),
    comodo: asString(record.comodo),
    quantidade: asNumber(record.quantidade),
    tipo: ['entrada', 'consumo', 'ajuste', 'exclusao'].includes(tipo) ? tipo as MovementType : undefined,
    data: asString(record.data),
  };
};

const toRoomChart = (value: unknown) =>
  asArray(value).map(item => {
    const record = isRecord(item) ? item : {};
    return {
      name: asString(record.name) || 'Outros',
      total: asNumber(record.total),
    };
  });

const toCategoryChart = (value: unknown) =>
  asArray(value).map(item => {
    const record = isRecord(item) ? item : {};
    return {
      name: asString(record.name) || 'Geral',
      value: asNumber(record.value),
    };
  });

export async function fetchDashboardMetrics(unidadeId: string): Promise<DashboardMetrics> {
  const { data, error } = await measureAsync(
    'get_dashboard_metrics',
    'supabase.rpc',
    async () => await supabase.rpc('get_dashboard_metrics', {
      p_unidade_id: unidadeId,
    }),
  );

  if (error) throw error;

  const record = isRecord(data) ? data : {};

  return {
    total_skus: asNumber(record.total_skus),
    total_quantity: asNumber(record.total_quantity),
    critical_stock_count: asNumber(record.critical_stock_count),
    expired_count: asNumber(record.expired_count),
    urgent_expiry_count: asNumber(record.urgent_expiry_count),
    expiring_soon_count: asNumber(record.expiring_soon_count),
    today_activity_count: asNumber(record.today_activity_count),
    room_chart: toRoomChart(record.room_chart),
    category_chart: toCategoryChart(record.category_chart),
    expired_items: asArray(record.expired_items).map(toInventoryItem),
    urgent_expiry_items: asArray(record.urgent_expiry_items).map(toInventoryItem),
    expiring_soon_items: asArray(record.expiring_soon_items).map(toInventoryItem),
    critical_stock_items: asArray(record.critical_stock_items).map(toInventoryItem),
    recent_movements: asArray(record.recent_movements).map(toHistoryItem),
  };
}
