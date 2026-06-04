import { describe, expect, it } from 'vitest';
import {
  buildThemeStorageKey,
  DEFAULT_THEME_PREFERENCE,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_STORAGE_PREFIX,
} from './useThemePreference';

describe('theme preference helpers', () => {
  it('normaliza preferencias validas', () => {
    expect(normalizeThemePreference('system')).toBe('system');
    expect(normalizeThemePreference('light')).toBe('light');
    expect(normalizeThemePreference('dark')).toBe('dark');
  });

  it('usa o padrao seguro para valores invalidos', () => {
    expect(normalizeThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference('sepia')).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it('resolve automatico pela preferencia do sistema', () => {
    expect(resolveThemePreference('system', true)).toBe('dark');
    expect(resolveThemePreference('system', false)).toBe('light');
  });

  it('preserva escolhas explicitas independentemente do sistema', () => {
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
  });

  it('cria chave por usuario quando disponivel', () => {
    expect(buildThemeStorageKey(' User@Example.COM ')).toBe(`${THEME_STORAGE_PREFIX}:user@example.com`);
    expect(buildThemeStorageKey()).toBe(THEME_STORAGE_PREFIX);
  });
});
