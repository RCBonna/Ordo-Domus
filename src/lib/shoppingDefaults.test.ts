import { describe, expect, it } from 'vitest';
import {
  buildPurchaseFormFromInventoryMatch,
  emptyPurchaseForm,
  selectBestInventoryPurchaseMatch,
} from './shoppingDefaults';

describe('shopping purchase defaults', () => {
  it('prefere item existente com mesmo nome normalizado e categoria reponivel', () => {
    const match = selectBestInventoryPurchaseMatch('Caixa de cerveja', [
      {
        nome: 'Caixa de cerveja',
        categoria: 'Ferramentas',
        comodo: 'Garagem',
        armario: 'Prateleira 1',
        caixa: null,
        validade: null,
        quantidade: 0,
      },
      {
        nome: 'caixa de cerveja',
        categoria: 'Bebidas',
        comodo: 'Cozinha',
        armario: 'Armario baixo',
        caixa: 'Bebidas',
        validade: null,
        quantidade: 2,
      },
    ]);

    expect(match?.categoria).toBe('Bebidas');
    expect(match?.comodo).toBe('Cozinha');
  });

  it('monta formulario com categoria e local do inventario para permitir merge', () => {
    const form = buildPurchaseFormFromInventoryMatch({
      nome: 'Caixa de cerveja',
      categoria: 'Bebidas',
      comodo: 'Cozinha',
      armario: 'Armario baixo',
      caixa: 'Bebidas',
      validade: '',
      quantidade: 0,
    }, 3);

    expect(form).toEqual({
      categoria: 'Bebidas',
      comodo: 'Cozinha',
      armario: 'Armario baixo',
      caixa: 'Bebidas',
      validade: '',
      quantidade: 3,
    });
  });

  it('nao usa Geral por padrao quando nao ha item existente', () => {
    expect(emptyPurchaseForm(2)).toEqual({
      categoria: '',
      comodo: '',
      armario: '',
      caixa: '',
      validade: '',
      quantidade: 2,
    });
  });
});
