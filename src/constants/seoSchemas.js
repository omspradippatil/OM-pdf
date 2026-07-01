const BASE_URL = "https://om-pdf.netlify.app";

export function buildToolSchemas({ toolName, url, description, faqs }) {
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": toolName,
    "url": url || BASE_URL,
    "description": description,
    "inLanguage": "en",
    "isPartOf": {
      "@type": "WebSite",
      "name": "OM PDF",
      "url": BASE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": "OM PDF",
      "url": BASE_URL,
    },
  };

  if (!faqs || !faqs.length) return [webPage];

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

  return [webPage, faqSchema];
}
