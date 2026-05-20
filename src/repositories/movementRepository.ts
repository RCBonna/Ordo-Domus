import { supabase } from '../lib/supabaseClient';
import type { HistoryItem, InventoryMovement, MovementType } from '../types/domain';

export async function insertInventoryMovement(movement: InventoryMovement) {
  const { error } = await supabase
    .from('movimentacoes_inventario')
    .insert(movement);

  if (!error) return;

  const isMissingUserIdColumn =
    error.code === 'PGRST204' ||
    error.message?.toLowerCase().includes('user_id');

  if (isMissingUserIdColumn && 'user_id' in movement) {
    const { user_id: _userId, ...movementWithoutUserId } = movement;
    const { error: retryError } = await supabase
      .from('movimentacoes_inventario')
      .insert(movementWithoutUserId);

    if (!retryError) return;
    throw retryError;
  }

  throw error;
}

export async function fetchRecentInventoryMovements(unidadeId: string, limit = 50): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from('movimentacoes_inventario')
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('criado_em', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(movement => ({
    item: movement.item_nome,
    categoria: movement.categoria,
    comodo: movement.comodo,
    quantidade: movement.quantidade,
    tipo: movement.tipo as MovementType,
    data: movement.criado_em,
    armario: '',
    caixa: '',
    validade: '',
  }));
}
