const BASE_URL = "https://om-pdf.netlify.app";

export function buildToolSchemas({ toolName, url, description, faqs = [], howTo = [] }) {
  const pageUrl = url || BASE_URL;

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": toolName,
    "url": pageUrl,
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
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/og-image.jpg`
      }
    },
  };

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": toolName,
    "url": pageUrl,
    "description": description,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "featureList": [
      "100% Client-Side WebAssembly Processing",
      "Zero Server Uploads & Total Privacy",
      "Works Offline as a Progressive Web App",
      "No Watermarks and No Account Required"
    ]
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": BASE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Tools",
        "item": `${BASE_URL}/tools`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": toolName,
        "item": pageUrl,
      },
    ],
  };

  const schemas = [webPage, webApp, breadcrumbs];

  if (howTo && howTo.length > 0) {
    const howToSchema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": `How to use ${toolName}`,
      "description": `Step-by-step instructions on how to use ${toolName} with OM PDF online for free.`,
      "step": howTo.map((step, idx) => ({
        "@type": "HowToStep",
        "position": idx + 1,
        "name": step.title,
        "text": step.text,
      })),
    };
    schemas.push(howToSchema);
  }

  if (faqs && faqs.length > 0) {
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
    schemas.push(faqSchema);
  }

  return schemas;
}
