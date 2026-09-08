export const A11Y_STORAGE_KEY = 'dsp:a11y-prefs';

export type TextScale = 'default' | 'large' | 'xlarge';
export type MotionPref = 'system' | 'reduce' | 'full';
export type ContrastPref = 'system' | 'more' | 'standard';

export type A11yPrefs = {
  textScale: TextScale;
  motion: MotionPref;
  contrast: ContrastPref;
  underlineLinks: boolean;
};

export const defaultA11yPrefs: A11yPrefs = {
  textScale: 'default',
  motion: 'system',
  contrast: 'system',
  underlineLinks: false,
};

function isTextScale(value: unknown): value is TextScale {
  return value === 'default' || value === 'large' || value === 'xlarge';
}

function isMotionPref(value: unknown): value is MotionPref {
  return value === 'system' || value === 'reduce' || value === 'full';
}

function isContrastPref(value: unknown): value is ContrastPref {
  return value === 'system' || value === 'more' || value === 'standard';
}

export function loadA11yPrefs(): A11yPrefs {
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return { ...defaultA11yPrefs };
    const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      textScale: isTextScale(parsed.textScale) ? parsed.textScale : defaultA11yPrefs.textScale,
      motion: isMotionPref(parsed.motion) ? parsed.motion : defaultA11yPrefs.motion,
      contrast: isContrastPref(parsed.contrast) ? parsed.contrast : defaultA11yPrefs.contrast,
      underlineLinks: typeof parsed.underlineLinks === 'boolean' ? parsed.underlineLinks : false,
    };
  } catch {
    return { ...defaultA11yPrefs };
  }
}

export function saveA11yPrefs(prefs: A11yPrefs) {
  window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
}

export function systemPrefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function systemPrefersMoreContrast() {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

export function effectiveReduceMotion(prefs: A11yPrefs) {
  if (prefs.motion === 'reduce') return true;
  if (prefs.motion === 'full') return false;
  return systemPrefersReducedMotion();
}

export function effectiveHighContrast(prefs: A11yPrefs) {
  if (prefs.contrast === 'more') return true;
  if (prefs.contrast === 'standard') return false;
  return systemPrefersMoreContrast();
}

/** Apply classes on <html> so CSS (and native WebView) pick up the prefs. */
export function applyA11yPrefs(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.dataset.a11yText = prefs.textScale;
  root.classList.toggle('reduce-motion', effectiveReduceMotion(prefs));
  root.classList.toggle('allow-motion', prefs.motion === 'full');
  root.classList.toggle('high-contrast', effectiveHighContrast(prefs));
  root.classList.toggle('underline-links', prefs.underlineLinks);
}

export function applyStoredA11yPrefs() {
  applyA11yPrefs(loadA11yPrefs());
}
