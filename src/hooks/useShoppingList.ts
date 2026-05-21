import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { buildPurchaseFormFromInventoryMatch, emptyPurchaseForm } from '../lib/shoppingDefaults';
import { fetchInventoryPurchaseMatch, fetchShoppingSuggestions } from '../repositories/inventoryRepository';
import { cancelManualShoppingItem, createManualShoppingItem, fetchManualShoppingItems } from '../repositories/shoppingRepository';
import { completeManualShoppingItemWithInventory } from '../services/shoppingService';
import type { CompleteManualShoppingItemForm, HistoryItem, ManualShoppingItem, ShoppingListItem, ZeroStockLocation } from '../types/domain';

export function useShoppingList(unidadeId: string | undefined, enabled: boolean, onActionRecorded?: (item: HistoryItem) => void) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [manualShoppingItems, setManualShoppingItems] = useState<ManualShoppingItem[]>([]);
  const [zeroStockLocations, setZeroStockLocations] = useState<ZeroStockLocation[]>([]);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);
  const [isSavingManualItem, setIsSavingManualItem] = useState(false);
  const [isCompletingManualItemId, setIsCompletingManualItemId] = useState<string | null>(null);

  const carregarListaDeCompras = async () => {
    if (!unidadeId) return;

    setIsShoppingListLoading(true);
    try {
      const result = await fetchShoppingSuggestions(unidadeId);
      setShoppingItems(result.items);
      setZeroStockLocations(result.zeroStockLocations);
    } catch {
      logger.warn('Falha ao carregar lista de compras.');
    }

    try {
      const manualItems = await fetchManualShoppingItems(unidadeId);
      setManualShoppingItems(manualItems);
    } catch {
      logger.warn('Itens manuais da lista de compras indisponiveis.');
    } finally {
      setIsShoppingListLoading(false);
    }
  };

  const adicionarItemManual = async (nome: string, quantidade: number, observacao = '') => {
    if (!unidadeId) return;
    const cleanName = nome.trim();
    if (!cleanName) {
      toast.error('Informe o item para adicionar.');
      return;
    }

    setIsSavingManualItem(true);
    try {
      const item = await createManualShoppingItem({
        unidadeId,
        nome: cleanName,
        quantidade: Math.max(1, quantidade),
        observacao,
      });
      setManualShoppingItems((current) => [item, ...current]);
      toast.success('Item adicionado à lista.');
    } catch {
      logger.warn('Falha ao adicionar item manual na lista de compras.');
      toast.error('Não foi possível adicionar o item.');
    } finally {
      setIsSavingManualItem(false);
    }
  };

  const cancelarItemManual = async (id: string) => {
    try {
      await cancelManualShoppingItem(id);
      setManualShoppingItems((current) => current.filter((item) => item.id !== id));
      toast.success('Item removido da lista.');
    } catch {
      logger.warn('Falha ao remover item manual da lista de compras.');
      toast.error('Não foi possível remover o item.');
    }
  };

  const concluirCompraManual = async (item: ManualShoppingItem, form: CompleteManualShoppingItemForm) => {
    if (!unidadeId) return;

    setIsCompletingManualItemId(item.id);
    try {
      const historyItem = await completeManualShoppingItemWithInventory({
        unidadeId,
        item,
        ...form,
      });
      setManualShoppingItems((current) => current.filter((manualItem) => manualItem.id !== item.id));
      if (onActionRecorded) {
        onActionRecorded(historyItem);
      }
      toast.success('Compra adicionada ao inventário.');
    } catch {
      logger.warn('Falha ao concluir compra manual.');
      toast.error('Não foi possível concluir a compra.');
    } finally {
      setIsCompletingManualItemId(null);
    }
  };

  const prepararCompraManual = async (item: ManualShoppingItem): Promise<CompleteManualShoppingItemForm> => {
    if (!unidadeId) return emptyPurchaseForm(item.quantidade);

    try {
      const match = await fetchInventoryPurchaseMatch(unidadeId, item.nome);
      return buildPurchaseFormFromInventoryMatch(match, item.quantidade);
    } catch {
      logger.warn('Falha ao buscar dados existentes para compra manual.');
      return emptyPurchaseForm(item.quantidade);
    }
  };

  useEffect(() => {
    if (enabled) {
      carregarListaDeCompras();
    }
  }, [enabled, unidadeId]);

  return {
    shoppingItems,
    manualShoppingItems,
    zeroStockLocations,
    isShoppingListLoading,
    isSavingManualItem,
    isCompletingManualItemId,
    carregarListaDeCompras,
    adicionarItemManual,
    cancelarItemManual,
    concluirCompraManual,
    prepararCompraManual,
  };
}
