import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, url, schema }) {
  const siteName = "OM PDF";
  const defaultDesc = "OM PDF is a free, private PDF toolkit. Merge, split, compress, and convert PDF files instantly in your browser. Your files never leave your device.";
  const defaultUrl = "https://om-pdf.netlify.app";

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="OM PDF" />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url || defaultUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url || defaultUrl} />
      <meta property="og:title" content={title ? `${title} | ${siteName}` : siteName} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={`${defaultUrl}/og-image.jpg`} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url || defaultUrl} />
      <meta name="twitter:title" content={title ? `${title} | ${siteName}` : siteName} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={`${defaultUrl}/og-image.jpg`} />

      {/* Theme Color */}
      <meta name="theme-color" content="#2563EB" />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
