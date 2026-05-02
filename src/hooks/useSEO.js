import { useEffect } from 'react';

/**
 * Dynamically updates <title> and meta description for each page.
 * Critical for React SPA SEO — Google reads these after JS renders.
 *
 * @param {string} title       - Page <title> (max ~60 chars)
 * @param {string} description - Meta description (max ~160 chars)
 * @param {string} [canonical] - Full URL (e.g. https://om-pdf.netlify.app/merge-pdf)
 */
export default function useSEO(title, description, canonical) {
  useEffect(() => {
    // Title
    if (title) document.title = title;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    if (description) metaDesc.content = description;

    // OG title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) ogTitle.content = title;

    // OG description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && description) ogDesc.content = description;

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;

      // OG URL
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.content = canonical;
    }
  }, [title, description, canonical]);
}
