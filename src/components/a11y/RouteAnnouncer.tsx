import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Announces page changes to screen readers after client-side navigation. */
export function RouteAnnouncer() {
  const location = useLocation();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => {
      const heading = document.querySelector('#main-content h1');
      const name = heading?.textContent?.trim() || document.title;
      setMessage(name);
    }, 80);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
