import { useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_PREFIX = 'ordo_domus_theme_preference_v1';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

export function useThemePreference(userKey?: string | null) {
  const storageKey = useMemo(() => buildThemeStorageKey(userKey), [userKey]);
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredThemePreference(storageKey));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => (
    resolveThemePreference(preference, getSystemPrefersDark())
  ));

  useEffect(() => {
    setPreferenceState(readStoredThemePreference(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    const applyResolvedTheme = () => {
      const nextResolvedTheme = resolveThemePreference(preference, Boolean(media?.matches));
      setResolvedTheme(nextResolvedTheme);
      applyThemeClass(nextResolvedTheme);
    };

    applyResolvedTheme();

    if (preference !== 'system' || !media) return;

    media.addEventListener?.('change', applyResolvedTheme);
    return () => {
      media.removeEventListener?.('change', applyResolvedTheme);
    };
  }, [preference]);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    writeStoredThemePreference(storageKey, nextPreference);
  };

  return {
    preference,
    resolvedTheme,
    setPreference,
  };
}

export function buildThemeStorageKey(userKey?: string | null) {
  const normalizedUserKey = userKey?.trim().toLowerCase();
  return normalizedUserKey
    ? `${THEME_STORAGE_PREFIX}:${normalizedUserKey}`
    : THEME_STORAGE_PREFIX;
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
    ? value
    : DEFAULT_THEME_PREFERENCE;
}

export function resolveThemePreference(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

function readStoredThemePreference(storageKey: string): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCE;

  try {
    return normalizeThemePreference(window.localStorage.getItem(storageKey));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

function writeStoredThemePreference(storageKey: string, preference: ThemePreference) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, preference);
  } catch {
    // Persistencia local indisponivel nao deve impedir o app de carregar.
  }
}

function getSystemPrefersDark() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

function applyThemeClass(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
