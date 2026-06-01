import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'SkillSeal';
const BASE_URL = 'https://skillseal.tech';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION =
  'SkillSeal verifies candidate skills through AI-powered contextual assessments. Recruiters hire with confidence. Candidates prove their expertise with a Seal.';

export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  canonical,
  noIndex = false,
}: SEOProps = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Verified Skills for Proven Hiring`;

    // Title
    document.title = fullTitle;

    // Helper to upsert <meta> tags
    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        const attr = selector.startsWith('meta[name')
          ? 'name'
          : selector.startsWith('meta[property')
            ? 'property'
            : 'name';
        const value = selector.match(/["']([^"']+)["']/)?.[1] ?? '';
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to upsert <link> tags
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    setMeta('meta[name="description"]', description);
    if (keywords) setMeta('meta[name="keywords"]', keywords);
    setMeta('meta[name="robots"]', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', ogImage);
    if (canonical) {
      setMeta('meta[property="og:url"]', `${BASE_URL}${canonical}`);
      setLink('canonical', `${BASE_URL}${canonical}`);
    }

    // Twitter
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', ogImage);
  }, [title, description, keywords, ogImage, canonical, noIndex]);
}
