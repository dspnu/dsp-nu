import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Building, Vote, GraduationCap, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { useEffect, useState } from 'react';

export function MobileNav() {
  const MAX_NAV_SLOTS = 5;
  const location = useLocation();
  const { profile } = useAuth();
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const [showMore, setShowMore] = useState(false);

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.includes('VP of New Member Development') ||
    profile?.positions?.includes('VP of Pledge Education') ||
    profile?.positions?.includes('VP of New Member Education');
  const showPDP = isNewMember || isVP;

  const allItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Building, label: 'Chapter', path: '/chapter' },
    { icon: Users, label: 'People', path: '/people' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(showPDP ? [{ icon: GraduationCap, label: 'PDP', path: '/pdp' }] : []),
    ...(eopVisible ? [{ icon: Vote, label: 'EOP', path: '/eop' }] : []),
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

  // Check if a "more" item is currently active
  const moreIsActive = moreItems.some(item =>
    location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
  );

  return (
    <>
      {/* More menu overlay */}
      {hasOverflow && showMore && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm">
            <div
              className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-lg p-2 space-y-0.5"
              onClick={e => e.stopPropagation()}
            >
              {moreItems.map(({ icon: Icon, label, path }) => {
                const isActive = location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(path));
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating pill nav bar */}
      <nav className="fixed bottom-4 left-4 right-4 z-[100] md:hidden">
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
                className={cn(
                  'relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all active:scale-90',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10" />
                )}
                <Icon className={cn("h-5 w-5 relative z-10", isActive && "stroke-[2.5px]")} />
                <span className={cn(
                  "text-[10px] mt-0.5 relative z-10",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          {hasOverflow && (
            <button
              onClick={() => setShowMore(v => !v)}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all active:scale-90',
                (showMore || moreIsActive) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {(showMore || moreIsActive) && (
                <div className="absolute inset-0 rounded-xl bg-primary/10" />
              )}
              <MoreHorizontal className={cn("h-5 w-5 relative z-10", (showMore || moreIsActive) && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] mt-0.5 relative z-10",
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
