import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, url, canonicalUrl, schema, noindex = false }) {
  const siteName = "OM PDF";
  const defaultDesc = "OM PDF is a free, private PDF toolkit. Merge, split, compress, and convert PDF files instantly in your browser. Your files never leave your device.";
  const defaultUrl = "https://om-pdf.netlify.app";
  const resolvedUrl = url || defaultUrl;
  const resolvedCanonical = canonicalUrl || resolvedUrl;
  const normalizedTitle = title && title.includes(siteName) ? title : (title ? `${title} | ${siteName}` : siteName);
  const schemaItems = Array.isArray(schema) ? schema : (schema ? [schema] : []);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{normalizedTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="OM PDF" />
      <meta
        name="robots"
        content={
          noindex
            ? "noindex, nofollow, noarchive"
            : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        }
      />

      {/* Canonical URL */}
      <link rel="canonical" href={resolvedCanonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:title" content={normalizedTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={`${defaultUrl}/og-image.jpg`} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={resolvedUrl} />
      <meta name="twitter:title" content={normalizedTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={`${defaultUrl}/og-image.jpg`} />

      {/* Theme Color */}
      <meta name="theme-color" content="#2563EB" />

      {/* Structured Data (JSON-LD) */}
      {schemaItems.map((item, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
