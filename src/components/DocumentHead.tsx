import { useEffect } from 'react';
import { org } from '@/config/org';

function setMeta(attr: string, attrValue: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function DocumentHead() {
  useEffect(() => {
    const title = `${org.shortName} – ${org.name}`;
    const description = org.meta.description;
    const byLine = `By ${org.meta.companyName}`;

    document.title = title;

    setMeta('name', 'description', byLine);
    setMeta('name', 'author', `${org.name} ${org.chapterName}`);
    setMeta('name', 'theme-color', org.meta.themeColor);
    setMeta('name', 'apple-mobile-web-app-title', org.shortName);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);

    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
  }, []);

  return null;
}
