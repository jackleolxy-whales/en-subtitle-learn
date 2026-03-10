import { useCallback, useEffect, useMemo, useState } from 'react';
import { getResolvedTheme, getStoredThemeMode, setThemeMode, type ThemeMode } from '../utils/theme';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => getResolvedTheme());

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    const onChange = () => {
      setResolved(getResolvedTheme());
    };

    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const setModeAndApply = useCallback((next: ThemeMode) => {
    setMode(next);
    setThemeMode(next);
    setResolved(getResolvedTheme());
  }, []);

  const toggle = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    setModeAndApply(next);
  }, [resolved, setModeAndApply]);

  return useMemo(
    () => ({
      mode,
      resolved,
      setMode: setModeAndApply,
      toggle,
    }),
    [mode, resolved, setModeAndApply, toggle],
  );
}

