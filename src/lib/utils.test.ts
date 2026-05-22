import { describe, expect, it } from 'vitest';
import { formatarData, formatarTexto, getValidityStatus, isConsumivel } from './utils';

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

  it('completa fim de ano sem ano informado', () => {
    const currentYear = new Date().getFullYear();
    expect(formatarData('31/12')).toBe(`31/12/${currentYear}`);
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

describe('getValidityStatus', () => {
  const today = new Date(2026, 4, 20);

  it('classifica datas vencidas separadamente', () => {
    expect(getValidityStatus('19/05/2026', today)).toEqual({
      kind: 'expired',
      daysUntil: -1,
    });
  });

  it('classifica vencimentos nos próximos 7 dias', () => {
    expect(getValidityStatus('25/05/2026', today)).toEqual({
      kind: 'next_7',
      daysUntil: 5,
    });
  });

  it('classifica vencimentos nos próximos 30 dias', () => {
    expect(getValidityStatus('31/05/2026', today)).toEqual({
      kind: 'next_30',
      daysUntil: 11,
    });
  });

  it('trata validade mês/ano como último dia do mês', () => {
    expect(getValidityStatus('05/2026', today)).toEqual({
      kind: 'next_30',
      daysUntil: 11,
    });
  });

  it('aceita data ISO normalizada do banco', () => {
    expect(getValidityStatus('2026-06-30', today)).toEqual({
      kind: 'valid',
      daysUntil: 41,
    });
  });
});
