import { supabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';
import { selectBestInventoryPurchaseMatch } from '../lib/shoppingDefaults';
import { formatarData, isReponivelParaCompras, normalizarBusca } from '../lib/utils';
import type { FinalizeReceiptImportParams, InventoryItem, InventoryPageResult, InventoryQueryParams, ShoppingListItem, ShoppingListResult, UpsertInventoryParams, UpsertInventoryResult } from '../types/domain';

const escapeIlike = (value: string) => value.replace(/[%_]/g, char => `\\${char}`);

interface InventoryPageRpcRow {
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
  total_count: number;
}

async function fetchInventoryPageFallback({
  unidadeId,
  searchTerm = '',
  categoryFilter = '',
  roomFilter = '',
  expiryFilter = 'todos',
  page,
  pageSize,
}: InventoryQueryParams): Promise<InventoryPageResult> {
  const from = Math.max(0, page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let query = supabase
    .from('itens_inventario')
    .select('*', { count: 'exact' })
    .eq('unidade_id', unidadeId)
    .is('deletado_em', null);

  const normalizedSearch = searchTerm.trim();
  if (normalizedSearch) {
    const term = `%${escapeIlike(normalizedSearch)}%`;
    query = query.or(`nome.ilike.${term},categoria.ilike.${term},comodo.ilike.${term},armario.ilike.${term},caixa.ilike.${term}`);
  }

  if (categoryFilter.trim()) {
    query = query.ilike('categoria', `%${escapeIlike(categoryFilter.trim())}%`);
  }

  if (roomFilter.trim()) {
    query = query.ilike('comodo', `%${escapeIlike(roomFilter.trim())}%`);
  }

  if (expiryFilter === 'vencidos') {
    query = query.not('validade_date', 'is', null).lt('validade_date', today);
  } else if (expiryFilter === 'vence_7') {
    query = query.not('validade_date', 'is', null).gte('validade_date', today).lte('validade_date', in7Days);
  } else if (expiryFilter === 'vence_30') {
    query = query.not('validade_date', 'is', null).gte('validade_date', today).lte('validade_date', in30Days);
  } else if (expiryFilter === 'sem_validade') {
    query = query.is('validade_date', null);
  } else if (expiryFilter === 'estoque_critico') {
    query = query.lte('quantidade', 1);
  }

  const { data, error, count } = await query
    .order('comodo', { ascending: true, nullsFirst: false })
    .order('nome', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    items: data || [],
    total: count || 0,
  };
}

export async function fetchInventoryPage(params: InventoryQueryParams): Promise<InventoryPageResult> {
  const {
  unidadeId,
  searchTerm = '',
  categoryFilter = '',
  roomFilter = '',
  expiryFilter = 'todos',
  page,
  pageSize,
  } = params;

  const { data, error } = await supabase.rpc('get_inventory_page', {
    p_unidade_id: unidadeId,
    p_search_term: searchTerm.trim(),
    p_category_filter: categoryFilter.trim(),
    p_room_filter: roomFilter.trim(),
    p_expiry_filter: expiryFilter,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    logger.warn('RPC de inventario indisponivel; usando consulta direta como fallback.');
    return fetchInventoryPageFallback(params);
  }

  const rows = (data || []) as InventoryPageRpcRow[];

  return {
    items: rows.map(({ total_count: _totalCount, ...item }) => item),
    total: rows[0]?.total_count || 0,
  };
}

export async function upsertInventoryItem({
  unidadeId,
  nome,
  categoria,
  comodo,
  armario,
  caixa,
  quantidade,
  validade,
}: UpsertInventoryParams): Promise<UpsertInventoryResult | null> {
  const normalizedValidade = formatarData(validade) || '';

  const { data, error } = await supabase.rpc('upsert_inventario', {
    p_unidade_id: unidadeId,
    p_nome: nome,
    p_categoria: categoria,
    p_comodo: comodo,
    p_armario: armario,
    p_caixa: caixa,
    p_quantidade: quantidade,
    p_validade: normalizedValidade,
  });

  if (error) throw error;

  return data;
}

export async function finalizeReceiptImportItem({
  importacaoId,
  nome,
  categoria,
  comodo,
  armario,
  caixa,
  quantidade,
  validade,
}: FinalizeReceiptImportParams): Promise<UpsertInventoryResult | null> {
  const normalizedValidade = formatarData(validade) || '';

  const { data, error } = await supabase.rpc('efetivar_importacao_cupom', {
    p_importacao_id: importacaoId,
    p_nome: nome,
    p_categoria: categoria,
    p_comodo: comodo,
    p_armario: armario,
    p_caixa: caixa,
    p_quantidade: quantidade,
    p_validade: normalizedValidade,
  });

  if (error) throw error;

  return data;
}

export async function fetchShoppingSuggestions(unidadeId: string): Promise<ShoppingListResult> {
  const { data, error } = await supabase
    .from('itens_inventario')
    .select('id,nome,categoria,comodo,armario,caixa,quantidade')
    .eq('unidade_id', unidadeId)
    .is('deletado_em', null)
    .order('nome', { ascending: true });

  if (error) throw error;

  const inventoryItems = (data || []) as Pick<InventoryItem, 'id' | 'nome' | 'categoria' | 'comodo' | 'armario' | 'caixa' | 'quantidade'>[];

  const zeroStockLocations = inventoryItems
    .filter((item) => Number(item.quantidade) <= 0)
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      comodo: item.comodo,
      armario: item.armario,
      caixa: item.caixa,
    }));

  const groupedItems = inventoryItems
    .filter((item) => isReponivelParaCompras(item.categoria))
    .reduce<Map<string, ShoppingListItem>>((acc, item) => {
      const key = normalizarBusca(item.nome);
      if (!key) return acc;

      const quantidade = Number(item.quantidade);
      const current = acc.get(key);
      if (!current) {
        acc.set(key, {
          id: key,
          nome: item.nome,
          categoria: item.categoria,
          comodos: item.comodo ? [item.comodo] : [],
          quantidade,
          prioridade: quantidade <= 0 ? 'faltando' : 'baixo',
          totalRegistros: 1,
        });
        return acc;
      }

      const comodos = item.comodo && !current.comodos.includes(item.comodo)
        ? [...current.comodos, item.comodo]
        : current.comodos;

      const total = current.quantidade + quantidade;
      acc.set(key, {
        ...current,
        comodos,
        quantidade: total,
        prioridade: total <= 0 ? 'faltando' : 'baixo',
        totalRegistros: current.totalRegistros + 1,
      });
      return acc;
    }, new Map<string, ShoppingListItem>());

  const items = Array.from(groupedItems.values()).filter((item) => item.quantidade <= 1).sort((a, b) => {
    if (a.quantidade !== b.quantidade) return a.quantidade - b.quantidade;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  return {
    items,
    zeroStockLocations,
  };
}

export async function fetchInventoryPurchaseMatch(unidadeId: string, itemName: string) {
  const normalizedName = normalizarBusca(itemName);
  if (!normalizedName) return null;

  const { data, error } = await supabase
    .from('itens_inventario')
    .select('nome,categoria,comodo,armario,caixa,validade,quantidade')
    .eq('unidade_id', unidadeId)
    .is('deletado_em', null)
    .order('nome', { ascending: true })
    .limit(500);

  if (error) throw error;

  return selectBestInventoryPurchaseMatch(itemName, data || []);
}
