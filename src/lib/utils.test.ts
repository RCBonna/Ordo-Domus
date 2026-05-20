import { describe, expect, it } from 'vitest';
import { formatarData, formatarTexto, isConsumivel } from './utils';

describe('formatarTexto', () => {
  it('normaliza texto com espaços e caixa mista', () => {
    expect(formatarTexto('  CAFÉ TORRADO  ')).toBe('Café torrado');
  });

  it('retorna string vazia para valores não textuais', () => {
    expect(formatarTexto(null)).toBe('');
    expect(formatarTexto(123)).toBe('');
  });
});

describe('formatarData', () => {
  it('aceita data brasileira completa válida', () => {
    expect(formatarData('15/12/2099')).toBe('15/12/2099');
  });

  it('usa o ano atual quando o ano não é informado', () => {
    const currentYear = new Date().getFullYear();
    expect(formatarData('05/08')).toBe(`05/08/${currentYear}`);
  });

  it('rejeita datas inválidas', () => {
    expect(formatarData('31/02/2099')).toBe('');
    expect(formatarData('99/99/2099')).toBe('');
    expect(formatarData('sem data')).toBe('');
  });
});

describe('isConsumivel', () => {
  it('classifica categorias duráveis como não consumíveis', () => {
    expect(isConsumivel('Ferramentas')).toBe(false);
    expect(isConsumivel('Eletrônicos')).toBe(false);
  });

  it('classifica categorias comuns ou ausentes como consumíveis', () => {
    expect(isConsumivel('Alimentos')).toBe(true);
    expect(isConsumivel()).toBe(true);
  });
});
