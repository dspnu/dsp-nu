import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Handles manifest `protocol_handlers` invocations. The handler URL uses `?uri=%s`;
 * the user agent substitutes the scheme-specific part of the custom protocol link for `%s`.
 */
function sanitizePath(path: string): string {
  const p = path.split(/[?#]/)[0];
  if (p.includes('..') || !p.startsWith('/')) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function resolveInAppPath(uriParam: string): string {
  const raw = uriParam.trim();
  if (!raw) return '/';

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* use raw */
  }

  try {
    const u = new URL(decoded);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      if (u.origin === window.location.origin) {
        const path = `${u.pathname}${u.search}${u.hash}` || '/';
        return sanitizePath(path.split('#')[0]);
      }
      return '/';
    }
    if (u.protocol.startsWith('web+')) {
      // e.g. web+dspnu:///people → /people; web+dspnu://events/upcoming → /events/upcoming;
      // web+dspnu:people/123 → /people/123
      if (u.hostname) {
        const rest = u.pathname && u.pathname !== '/' ? u.pathname : '';
        const joined = `/${u.hostname}${rest}`.replace(/\/{2,}/g, '/');
        return sanitizePath(joined);
      }
      if (u.pathname) {
        const path = u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`;
        return sanitizePath(path);
      }
      return '/';
    }
  } catch {
    /* fall through */
  }

  if (decoded.startsWith('/')) {
    return sanitizePath(decoded);
  }

  const first = decoded.split(/[/?#]/)[0]?.toLowerCase() ?? '';
  const allowed = new Set([
    '',
    'events',
    'people',
    'chapter',
    'settings',
    'notifications',
    'help',
    'auth',
    'onboarding',
    'pwa-open',
    'pwa-protocol',
  ]);

  if (allowed.has(first) || first.startsWith('people')) {
    const withSlash = decoded.startsWith('/') ? decoded : `/${decoded}`;
    return sanitizePath(withSlash);
  }

  return '/';
}

export default function PwaProtocolPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uri = params.get('uri') ?? '';

  useEffect(() => {
    const path = resolveInAppPath(uri);
    navigate(path, { replace: true });
  }, [navigate, uri]);

  return null;
}
