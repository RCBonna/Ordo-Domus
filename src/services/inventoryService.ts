import { formatarData, formatarTexto } from '../lib/utils';
import { getCurrentUserId } from '../repositories/authRepository';
import { updateInventoryItem, softDeleteInventoryItem, updateInventoryQuantity } from '../repositories/inventoryMutationRepository';
import { insertInventoryMovement } from '../repositories/movementRepository';
import type { EditableInventoryItem, HistoryItem, InventoryItem, MovementType } from '../types/domain';

interface UpdateInventoryItemCommand {
  unidadeId: string;
  itemId: string;
  editingItemData: EditableInventoryItem;
  originalItem?: InventoryItem;
}

interface InventoryItemCommand {
  unidadeId: string;
  item: InventoryItem;
}

const toHistoryItem = (
  item: InventoryItem | EditableInventoryItem,
  quantidade: number,
  tipo: MovementType,
): HistoryItem => ({
  item: formatarTexto(item.nome) || '',
  categoria: formatarTexto(item.categoria) || '',
  comodo: formatarTexto(item.comodo) || '',
  quantidade,
  tipo,
  data: new Date().toISOString(),
});

export async function updateInventoryItemWithAudit({
  unidadeId,
  itemId,
  editingItemData,
  originalItem,
}: UpdateInventoryItemCommand): Promise<HistoryItem> {
  const userId = await getCurrentUserId();
  const originalQuantity = Number(originalItem?.quantidade ?? 0);
  const nextQuantity = Number(editingItemData.quantidade ?? 0);
  const quantityChanged = Boolean(originalItem) && originalQuantity !== nextQuantity;
  const diff = quantityChanged ? nextQuantity - originalQuantity : 0;
  const movementType: MovementType = quantityChanged ? (diff > 0 ? 'entrada' : 'consumo') : 'ajuste';
  const movementQuantity = quantityChanged ? Math.abs(diff) : 0;

  await updateInventoryItem(itemId, {
    nome: formatarTexto(editingItemData.nome),
    categoria: formatarTexto(editingItemData.categoria),
    comodo: formatarTexto(editingItemData.comodo),
    armario: formatarTexto(editingItemData.armario),
    caixa: formatarTexto(editingItemData.caixa),
    quantidade: editingItemData.quantidade ?? 0,
    validade: formatarData(editingItemData.validade),
  });

  await insertInventoryMovement({
    unidade_id: unidadeId,
    item_id: itemId,
    item_nome: formatarTexto(editingItemData.nome),
    categoria: formatarTexto(editingItemData.categoria),
    comodo: formatarTexto(editingItemData.comodo),
    quantidade: movementQuantity,
    tipo: movementType,
    user_id: userId,
  });

  return toHistoryItem(editingItemData, movementQuantity, movementType);
}

export async function deleteInventoryItemWithAudit({
  unidadeId,
  item,
}: InventoryItemCommand): Promise<HistoryItem> {
  const userId = await getCurrentUserId();

  await insertInventoryMovement({
    unidade_id: unidadeId,
    item_id: item.id,
    item_nome: item.nome,
    categoria: item.categoria,
    comodo: item.comodo,
    quantidade: item.quantidade,
    tipo: 'exclusao',
    user_id: userId,
  });

  await softDeleteInventoryItem(item.id, userId);

  return toHistoryItem(item, item.quantidade, 'exclusao');
}

export async function consumeInventoryItemWithAudit({
  unidadeId,
  item,
}: InventoryItemCommand): Promise<HistoryItem> {
  const userId = await getCurrentUserId();
  const nextQuantity = Number(item.quantidade) - 1;

  await updateInventoryQuantity(item.id, nextQuantity);

  await insertInventoryMovement({
    unidade_id: unidadeId,
    item_id: item.id,
    item_nome: item.nome,
    categoria: item.categoria,
    comodo: item.comodo,
    quantidade: 1,
    tipo: 'consumo',
    user_id: userId,
  });

  return toHistoryItem(item, 1, 'consumo');
}

export async function undoConsumeInventoryItemWithAudit({
  unidadeId,
  item,
}: InventoryItemCommand): Promise<HistoryItem> {
  const userId = await getCurrentUserId();

  await updateInventoryQuantity(item.id, Number(item.quantidade));

  await insertInventoryMovement({
    unidade_id: unidadeId,
    item_id: item.id,
    item_nome: item.nome,
    categoria: item.categoria,
    comodo: item.comodo,
    quantidade: 1,
    tipo: 'entrada',
    user_id: userId,
  });

  return toHistoryItem(item, 1, 'entrada');
}
