const BASE_URL = "https://om-pdf.netlify.app";

export function buildToolSchemas({ toolName, url, description, faqs }) {
  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": toolName,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Any",
    "url": url || BASE_URL,
    "description": description,
    "isAccessibleForFree": true,
    "inLanguage": "en",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "provider": {
      "@type": "Organization",
      "name": "OM PDF",
      "url": BASE_URL,
    },
  };

  if (!faqs || !faqs.length) return [webApp];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a,
      },
    })),
  };

  return [webApp, faqSchema];
}
