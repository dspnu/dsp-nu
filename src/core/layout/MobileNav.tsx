import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Building, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/core/auth/AuthContext';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { getEnabledNavItems } from '@/config/featureRegistry';
import { useEffect, useId, useRef, useState } from 'react';

export function MobileNav() {
  const MAX_NAV_SLOTS = 5;
  const location = useLocation();
  const { profile } = useAuth();
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const [showMore, setShowMore] = useState(false);
  const moreMenuId = useId();
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const featureNavItems = getEnabledNavItems(profile)
    .filter(item => {
      if (item.path === '/eop') return eopVisible;
      return true;
    });

  const allItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Building, label: 'Chapter', path: '/chapter' },
    { icon: Users, label: 'People', path: '/people' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...featureNavItems,
  ];

  const hasOverflow = allItems.length > MAX_NAV_SLOTS;
  const visibleItems = hasOverflow
    ? allItems.slice(0, MAX_NAV_SLOTS - 1)
    : allItems;
  const moreItems = hasOverflow
    ? allItems.slice(MAX_NAV_SLOTS - 1)
    : [];

  useEffect(() => {
    if (!hasOverflow && showMore) {
      setShowMore(false);
    }
  }, [hasOverflow, showMore]);

  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!showMore) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMore(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMore]);

  const moreIsActive = moreItems.some(item =>
    location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
  );

  return (
    <>
      {hasOverflow && showMore && (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="Dismiss more pages menu"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm">
            <div
              id={moreMenuId}
              role="dialog"
              aria-modal="true"
              aria-label="More pages"
              className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-lg p-2 space-y-0.5"
            >
              {moreItems.map(({ icon: Icon, label, path }) => {
                const isActive = location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(path));
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setShowMore(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-4 z-[100] md:hidden"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Primary"
      >
        <div className="flex items-center justify-around rounded-2xl bg-card/80 backdrop-blur-2xl border border-border/30 shadow-lg px-2 py-1.5"
          style={{ boxShadow: '0 8px 32px hsl(270 50% 40% / 0.08), 0 2px 8px hsl(0 0% 0% / 0.06)' }}
        >
          {visibleItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center min-h-11 min-w-11 py-2 px-3 rounded-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10" aria-hidden />
                )}
                <Icon className={cn("h-5 w-5 relative z-10", isActive && "stroke-[2.5px]")} aria-hidden />
                <span className={cn(
                  "text-[11px] mt-0.5 relative z-10",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}

          {hasOverflow && (
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setShowMore(v => !v)}
              aria-expanded={showMore}
              aria-controls={moreMenuId}
              aria-haspopup="dialog"
              className={cn(
                'relative flex flex-col items-center justify-center min-h-11 min-w-11 py-2 px-3 rounded-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                (showMore || moreIsActive) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {(showMore || moreIsActive) && (
                <div className="absolute inset-0 rounded-xl bg-primary/10" aria-hidden />
              )}
              <MoreHorizontal className={cn("h-5 w-5 relative z-10", (showMore || moreIsActive) && "stroke-[2.5px]")} aria-hidden />
              <span className={cn(
                "text-[11px] mt-0.5 relative z-10",
                (showMore || moreIsActive) ? "font-semibold" : "font-medium"
              )}>
                More
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
