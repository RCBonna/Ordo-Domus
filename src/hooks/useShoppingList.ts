import { useEffect, useState } from 'react';
import { logger } from '../lib/logger';
import { fetchShoppingSuggestions } from '../repositories/inventoryRepository';
import type { ShoppingListItem } from '../types/domain';

export function useShoppingList(unidadeId: string | undefined, enabled: boolean) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [isShoppingListLoading, setIsShoppingListLoading] = useState(false);

  const carregarListaDeCompras = async () => {
    if (!unidadeId) return;

    setIsShoppingListLoading(true);
    try {
      const items = await fetchShoppingSuggestions(unidadeId);
      setShoppingItems(items);
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
    isShoppingListLoading,
    carregarListaDeCompras,
  };
}
