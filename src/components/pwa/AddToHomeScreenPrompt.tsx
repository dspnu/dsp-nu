import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MoreVertical, X } from 'lucide-react';
import { org } from '@/config/org';
import { useIsMobile } from '@/hooks/use-mobile';

const STORAGE_KEY = 'dsp-nu-a2hs-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectMobileOS(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function IOSShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 3v10M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AddToHomeScreenContextValue = { openAddToHomeScreen: () => void };

const AddToHomeScreenContext = createContext<AddToHomeScreenContextValue | null>(null);

export function useAddToHomeScreen() {
  const ctx = useContext(AddToHomeScreenContext);
  if (!ctx) {
    throw new Error('useAddToHomeScreen must be used within AddToHomeScreenProvider');
  }
  return ctx;
}

function AddToHomeScreenOverlay({
  variant,
  onDismiss,
}: {
  variant: 'ios' | 'android';
  onDismiss: () => void;
}) {
  const isIOS = variant === 'ios';

  return (
    <div
      className="fixed inset-0 z-[110] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a2hs-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onDismiss}
        aria-label="Dismiss install instructions"
      />
      <div className="absolute bottom-24 left-4 right-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto relative w-full max-w-md rounded-2xl border border-zinc-700/90 bg-zinc-950 px-5 pt-6 pb-9 shadow-2xl">
          <div
            className="absolute left-1/2 -bottom-2 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[10px] border-x-transparent border-t-zinc-950 drop-shadow-sm"
            aria-hidden
          />
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center pr-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shadow-lg ring-1 ring-white/10">
              <span className="text-xl font-display font-bold text-primary-foreground">{org.greekLetters}</span>
            </div>
            <h2 id="a2hs-title" className="text-lg font-semibold tracking-tight text-white">
              Install {org.shortName}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Add this app to your home screen for easy access and a better experience.
            </p>
          </div>

          <div className="my-5 h-px bg-zinc-800" />

          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-center text-sm text-zinc-300">
            {isIOS ? (
              <>
                <span>Tap</span>
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/60 text-sky-400"
                  title="Share"
                >
                  <IOSShareIcon className="h-5 w-5" />
                </span>
                <span>then</span>
                <span className="font-semibold text-white">Add to Home Screen</span>
              </>
            ) : (
              <>
                <span>Tap</span>
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/60 text-sky-400"
                  title="Menu"
                >
                  <MoreVertical className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="max-w-[14rem] text-balance">
                  <span className="whitespace-nowrap">in the top right, then </span>
                  <span className="font-semibold text-white">Install app</span>
                  <span> or </span>
                  <span className="font-semibold text-white">Add to Home screen</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddToHomeScreenProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const openPrompt = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const os = detectMobileOS();
    if (os !== 'ios' && os !== 'android') return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(() => setOpen(true), 2800);
    return () => window.clearTimeout(id);
  }, [isMobile]);

  const overlayVariant: 'ios' | 'android' | null = useMemo(() => {
    if (!open || !isMobile) return null;
    const os = detectMobileOS();
    if (os === 'ios') return 'ios';
    return 'android';
  }, [open, isMobile]);

  const value = useMemo(() => ({ openAddToHomeScreen: openPrompt }), [openPrompt]);

  return (
    <AddToHomeScreenContext.Provider value={value}>
      {children}
      {overlayVariant && <AddToHomeScreenOverlay variant={overlayVariant} onDismiss={dismiss} />}
    </AddToHomeScreenContext.Provider>
  );
}
