import { useEffect, useState } from 'react';
import { logger } from '../lib/logger';
import { fetchShoppingSuggestions } from '../repositories/inventoryRepository';
import type { ShoppingListItem, ZeroStockLocation } from '../types/domain';

export function useShoppingList(unidadeId: string | undefined, enabled: boolean) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [zeroStockLocations, setZeroStockLocations] = useState<ZeroStockLocation[]>([]);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);

  const carregarListaDeCompras = async () => {
    if (!unidadeId) return;

    setIsShoppingListLoading(true);
    try {
      const result = await fetchShoppingSuggestions(unidadeId);
      setShoppingItems(result.items);
      setZeroStockLocations(result.zeroStockLocations);
    } catch {
      logger.warn('Falha ao carregar lista de compras.');
    } finally {
      setIsShoppingListLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      carregarListaDeCompras();
    }
  }, [enabled, unidadeId]);

  return {
    shoppingItems,
    zeroStockLocations,
    isShoppingListLoading,
    carregarListaDeCompras,
  };
}
