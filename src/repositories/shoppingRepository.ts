import { supabase } from '../lib/supabaseClient';
import type { CreateManualShoppingItemParams, ManualShoppingItem } from '../types/domain';

export async function fetchManualShoppingItems(unidadeId: string): Promise<ManualShoppingItem[]> {
  const { data, error } = await supabase
    .from('lista_compras')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });

  if (error) throw error;

  return (data || []) as ManualShoppingItem[];
}

export async function createManualShoppingItem({
  unidadeId,
  nome,
  quantidade,
  observacao = '',
}: CreateManualShoppingItemParams): Promise<ManualShoppingItem> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('lista_compras')
    .insert({
      unidade_id: unidadeId,
      nome,
      quantidade,
      observacao: observacao.trim() || null,
      criado_por: userData.user?.id || null,
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as ManualShoppingItem;
}

export async function cancelManualShoppingItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('lista_compras')
    .update({
      status: 'cancelado',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}
