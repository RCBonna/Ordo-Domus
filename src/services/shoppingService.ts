import { formatarData, formatarTexto, normalizarCategoria } from '../lib/utils';
import { getCurrentUserId } from '../repositories/authRepository';
import { upsertInventoryItem } from '../repositories/inventoryRepository';
import { insertInventoryMovement } from '../repositories/movementRepository';
import { markManualShoppingItemAsBought } from '../repositories/shoppingRepository';
import type { CompleteManualShoppingItemParams, HistoryItem } from '../types/domain';

export async function completeManualShoppingItemWithInventory({
  unidadeId,
  item,
  categoria,
  comodo,
  armario,
  caixa,
  validade,
  quantidade,
}: CompleteManualShoppingItemParams): Promise<HistoryItem> {
  const cleanName = formatarTexto(item.nome);
  const cleanCategoria = normalizarCategoria(categoria) || 'Geral';
  const cleanComodo = formatarTexto(comodo) || 'Não informado';
  const cleanArmario = formatarTexto(armario);
  const cleanCaixa = formatarTexto(caixa);
  const cleanValidade = formatarData(validade) || '';
  const cleanQuantidade = Math.max(1, Number(quantidade) || Number(item.quantidade) || 1);
  const userId = await getCurrentUserId();

  const result = await upsertInventoryItem({
    unidadeId,
    nome: cleanName,
    categoria: cleanCategoria,
    comodo: cleanComodo,
    armario: cleanArmario,
    caixa: cleanCaixa,
    quantidade: cleanQuantidade,
    validade: cleanValidade,
  });

  const historyItem: HistoryItem = {
    item: result?.nome || cleanName,
    categoria: result?.categoria || cleanCategoria,
    comodo: result?.comodo || cleanComodo,
    armario: result?.armario || cleanArmario,
    caixa: result?.caixa || cleanCaixa,
    validade: result?.validade || cleanValidade,
    quantidade: cleanQuantidade,
    tipo: 'entrada',
    data: new Date().toISOString(),
    transcricao: `Compra realizada: ${item.nome}`,
  };

  await insertInventoryMovement({
    unidade_id: unidadeId,
    item_nome: historyItem.item,
    categoria: historyItem.categoria,
    comodo: historyItem.comodo,
    quantidade: cleanQuantidade,
    tipo: 'entrada',
    user_id: userId,
  });

  await markManualShoppingItemAsBought(item.id);

  return historyItem;
}
