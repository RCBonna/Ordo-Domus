import { isReponivelParaCompras, normalizarBusca } from './utils';
import type { CompleteManualShoppingItemForm, InventoryItem } from '../types/domain';

export type InventoryPurchaseMatch = Pick<
  InventoryItem,
  'nome' | 'categoria' | 'comodo' | 'armario' | 'caixa' | 'validade' | 'quantidade'
>;

export const emptyPurchaseForm = (quantidade = 1): CompleteManualShoppingItemForm => ({
  categoria: '',
  comodo: '',
  armario: '',
  caixa: '',
  validade: '',
  quantidade: Math.max(1, Number(quantidade) || 1),
});

export function selectBestInventoryPurchaseMatch(
  itemName: string,
  matches: InventoryPurchaseMatch[],
): InventoryPurchaseMatch | null {
  const normalizedItemName = normalizarBusca(itemName);
  if (!normalizedItemName) return null;

  const exactMatches = matches.filter((match) => normalizarBusca(match.nome) === normalizedItemName);
  if (exactMatches.length === 0) return null;

  return exactMatches.sort((a, b) => {
    const aReponivel = isReponivelParaCompras(a.categoria) ? 0 : 1;
    const bReponivel = isReponivelParaCompras(b.categoria) ? 0 : 1;
    if (aReponivel !== bReponivel) return aReponivel - bReponivel;

    const aQuantity = Number(a.quantidade) || 0;
    const bQuantity = Number(b.quantidade) || 0;
    if (aQuantity !== bQuantity) return aQuantity - bQuantity;

    return (a.comodo || '').localeCompare(b.comodo || '', 'pt-BR');
  })[0];
}

export function buildPurchaseFormFromInventoryMatch(
  match: InventoryPurchaseMatch | null,
  quantidade = 1,
): CompleteManualShoppingItemForm {
  if (!match) return emptyPurchaseForm(quantidade);

  return {
    categoria: match.categoria || '',
    comodo: match.comodo || '',
    armario: match.armario || '',
    caixa: match.caixa || '',
    validade: match.validade || '',
    quantidade: Math.max(1, Number(quantidade) || 1),
  };
}
