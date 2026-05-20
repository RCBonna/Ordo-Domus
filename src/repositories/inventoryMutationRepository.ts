import { supabase } from '../lib/supabaseClient';

interface InventoryUpdatePayload {
  nome: string;
  categoria: string;
  comodo: string;
  armario: string;
  caixa: string;
  quantidade: number | string;
  validade: string;
}

export async function updateInventoryItem(itemId: string, payload: InventoryUpdatePayload) {
  const { error } = await supabase
    .from('itens_inventario')
    .update(payload)
    .eq('id', itemId);

  if (error) throw error;
}

export async function softDeleteInventoryItem(itemId: string, userId: string | null) {
  const { error } = await supabase
    .from('itens_inventario')
    .update({
      deletado_em: new Date().toISOString(),
      deletado_por: userId,
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function updateInventoryQuantity(itemId: string, quantidade: number) {
  const { error } = await supabase
    .from('itens_inventario')
    .update({ quantidade })
    .eq('id', itemId);

  if (error) throw error;
}
