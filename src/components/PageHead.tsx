/**
 * PageHead
 *
 * Manages per-page SEO metadata: document title, meta description,
 * canonical URL, Open Graph tags, Twitter Card tags, and optional
 * JSON-LD structured data injection.
 */
import { useEffect } from 'react';

const BASE_TITLE = 'AIfacilitator';
const SITE_URL = 'https://aifacilitator.ai';
const DEFAULT_OG_IMAGE = 'https://aifacilitator.ai/og-image.png';

interface BreadcrumbItem {
  name: string;
  item?: string;
}

interface PageHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLd?: Record<string, any>[];
  breadcrumbs?: BreadcrumbItem[];
  noIndex?: boolean;
}

const setOrCreateMeta = (selector: string, value: string) => {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta') as HTMLMetaElement;
    const attrMatch = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (attrMatch) el.setAttribute(attrMatch[1], attrMatch[2]);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

export const PageHead = ({
  title,
  description,
  canonical,
  ogImage,
  jsonLd,
  breadcrumbs,
  noIndex = false,
}: PageHeadProps) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    const canonicalUrl = canonical ?? window.location.href.split('?')[0];
    const ogImageUrl = ogImage ?? DEFAULT_OG_IMAGE;

    document.title = fullTitle;

    if (description) setOrCreateMeta('meta[name="description"]', description);
    setOrCreateMeta('meta[name="robots"]', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonicalUrl;

    setOrCreateMeta('meta[property="og:title"]', fullTitle);
    setOrCreateMeta('meta[property="og:url"]', canonicalUrl);
    setOrCreateMeta('meta[property="og:image"]', ogImageUrl);
    if (description) setOrCreateMeta('meta[property="og:description"]', description);

    setOrCreateMeta('meta[name="twitter:title"]', fullTitle);
    setOrCreateMeta('meta[name="twitter:url"]', canonicalUrl);
    setOrCreateMeta('meta[name="twitter:image"]', ogImageUrl);
    if (description) setOrCreateMeta('meta[name="twitter:description"]', description);

    document.querySelectorAll('script[data-pagehead="true"]').forEach(el => el.remove());

    const schemas: Record<string, unknown>[] = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          ...breadcrumbs.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 2,
            name: b.name,
            ...(b.item ? { item: b.item } : {}),
          })),
        ],
      });
    }

    if (jsonLd) schemas.push(...jsonLd);

    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-pagehead', 'true');
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.title = BASE_TITLE;
      document.querySelectorAll('script[data-pagehead="true"]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogImage, jsonLd, breadcrumbs, noIndex]);

  return null;
};

export default PageHead;
