import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyA11yPrefs,
  defaultA11yPrefs,
  loadA11yPrefs,
  saveA11yPrefs,
  type A11yPrefs,
} from '@/lib/a11yPreferences';

type AccessibilityContextValue = {
  prefs: A11yPrefs;
  setPrefs: (next: Partial<A11yPrefs>) => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<A11yPrefs>(() =>
    typeof window === 'undefined' ? defaultA11yPrefs : loadA11yPrefs()
  );

  useEffect(() => {
    applyA11yPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const syncFromSystem = () => applyA11yPrefs(loadA11yPrefs());
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(prefers-contrast: more)');
    motion.addEventListener('change', syncFromSystem);
    contrast.addEventListener('change', syncFromSystem);
    return () => {
      motion.removeEventListener('change', syncFromSystem);
      contrast.removeEventListener('change', syncFromSystem);
    };
  }, []);

  const setPrefs = useCallback((next: Partial<A11yPrefs>) => {
    setPrefsState((current) => {
      const merged = { ...current, ...next };
      saveA11yPrefs(merged);
      applyA11yPrefs(merged);
      return merged;
    });
  }, []);

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilityPrefs() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibilityPrefs must be used within AccessibilityProvider');
  }
  return ctx;
}
