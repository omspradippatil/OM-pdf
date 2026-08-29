import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = "https://om-pdf.netlify.app";

async function run() {
  const indexHtmlPath = path.resolve(__dirname, '../dist/index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error("dist/index.html not found. Run 'vite build' first.");
    process.exit(1);
  }
  
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // Load sitemap
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error("public/sitemap.xml not found.");
    process.exit(1);
  }
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

  // Extract URLs from sitemap
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  const urls = [];
  while ((match = locRegex.exec(sitemapContent)) !== null) {
    urls.push(match[1]);
  }

  // Import application constants
  const seoModule = await import('../src/constants/seoMetadata.js');
  const SEO_METADATA = seoModule.SEO_METADATA;
  const getSeoMetadata = seoModule.getSeoMetadata;

  const toolsModule = await import('../src/constants/tools.js');
  const TOOLS = toolsModule.TOOLS;

  const blogModule = await import('../src/constants/blogPosts.js');
  const BLOG_POSTS = blogModule.BLOG_POSTS;

  const toolContentModule = await import('../src/constants/toolContent.js');
  const getToolContent = toolContentModule.getToolContent;

  const schemasModule = await import('../src/constants/seoSchemas.js');
  const buildToolSchemas = schemasModule.buildToolSchemas;

  // Make sure all tools from TOOLS are in the urls list
  for (const tool of TOOLS) {
    const fullUrl = `${BASE_URL}${tool.path}`;
    if (!urls.includes(fullUrl)) {
      urls.push(fullUrl);
    }
  }

  console.log(`Found ${urls.length} URLs to prerender with full SSR semantic HTML and JSON-LD schemas.`);

  let count = 0;

  for (const urlStr of urls) {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const cleanPath = pathname.replace(/^\/|\/$/g, '');
    const isHome = cleanPath === '';
    const canonicalUrl = isHome ? `${BASE_URL}/` : `${BASE_URL}/${cleanPath}`;

    const pageData = getPageData({
      cleanPath,
      canonicalUrl,
      SEO_METADATA,
      getSeoMetadata,
      TOOLS,
      BLOG_POSTS,
      getToolContent,
      buildToolSchemas
    });

    if (!pageData) {
      console.warn(`⚠️ Warning: No metadata resolver found for path: ${pathname}`);
      continue;
    }

    const { title, description, keywords, schemas, rootHTML } = pageData;

    let html = indexHtmlContent;

    // 1. Replace Title
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    
    // 2. Replace Description
    html = html.replace(
      /<meta name="description" content=".*?" \/>/s,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );

    // 3. Replace Keywords
    html = html.replace(
      /<meta name="keywords" content=".*?" \/>/s,
      `<meta name="keywords" content="${escapeHtml(keywords)}" />`
    );

    // 4. Inject Canonical, OG, Twitter & JSON-LD schemas in <head>
    let schemaTags = '';
    if (schemas && Array.isArray(schemas)) {
      for (const item of schemas) {
        schemaTags += `\n  <script type="application/ld+json">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`;
      }
    }

    const headInjections = `
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="${cleanPath.startsWith('blog/') ? 'article' : 'website'}" />
  <meta property="og:site_name" content="OM PDF" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />${schemaTags}
`;
    html = html.replace('</head>', headInjections + '\n</head>');

    // 5. Inject visible, semantic SSR HTML inside #root (clean fallback before React mounts)
    html = html.replace('<div id="root"></div>', `<div id="root">${rootHTML}</div>`);

    // 6. Write output
    if (isHome) {
      fs.writeFileSync(indexHtmlPath, html);
      console.log(`✓ Generated home: dist/index.html`);
    } else {
      const routeDir = path.resolve(__dirname, '../dist', cleanPath);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.resolve(routeDir, 'index.html'), html);
      console.log(`✓ Generated route: dist/${cleanPath}/index.html`);
    }
    count++;
  }

  console.log(`\n✅ Prerender Success: Generated ${count} fully indexed static HTML pages with zero hidden text.`);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPageData({ cleanPath, canonicalUrl, SEO_METADATA, getSeoMetadata, TOOLS, BLOG_POSTS, getToolContent, buildToolSchemas }) {
  // 1. Home Page
  if (cleanPath === '') {
    const title = "Free PDF Tools Online | Merge, Split, Compress, Convert PDF | OM PDF";
    const description = "Merge PDF, split PDF, compress PDF, convert PDF to JPG and add page numbers — all free, private and instant in your browser. No upload. No sign-up.";
    const keywords = "pdf tools, free pdf editor, merge pdf, split pdf, compress pdf, convert pdf, pdf to jpg, online pdf tools, free pdf converter, offline pdf";
    
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "OM PDF",
      "url": `${BASE_URL}/`,
      "description": description,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/tools?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    const homeFaqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is OM PDF free to use?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, OM PDF is 100% free with no sign-up, no subscriptions, and no watermarks." }
        },
        {
          "@type": "Question",
          "name": "Are my files uploaded to a remote server?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. All PDF processing happens locally in your web browser using WebAssembly. Your sensitive files never leave your device." }
        },
        {
          "@type": "Question",
          "name": "Can I use OM PDF offline?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes! OM PDF works offline as a Progressive Web App (PWA) once loaded in your browser." }
        }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2">
        <div class="navbar-container">
          <a href="/" class="brand-link"><strong>OM PDF</strong> — Free Privacy-First PDF Toolkit</a>
          <nav>
            <a href="/tools">All Tools</a>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
          </nav>
        </div>
      </header>
      <main class="home-page">
        <section class="hero-section">
          <h1>Free, Private PDF Tools — 100% in Your Browser</h1>
          <p class="hero-subtitle">Merge, split, compress, convert, edit, and sign PDFs locally. No uploads, no servers, zero data leakage.</p>
        </section>
        <section class="tools-section">
          <h2>Popular PDF Tools</h2>
          <div class="tools-grid">
            ${TOOLS.map(t => `
              <div class="tool-card">
                <a href="${t.path}">
                  <h3>${t.icon} ${t.title}</h3>
                  <p>${t.desc}</p>
                </a>
              </div>
            `).join('')}
          </div>
        </section>
        <section class="seo-content-section">
          <h2>Why Choose OM PDF?</h2>
          <p>Unlike traditional online PDF editors that upload sensitive files to remote servers, OM PDF processes your files directly on your computer or smartphone using WebAssembly. This ensures instant performance and complete data privacy for legal contracts, medical records, and financial files.</p>
        </section>
      </main>
    `;

    return { title, description, keywords, schemas: [websiteSchema, homeFaqSchema], rootHTML };
  }

  // 2. Blog Index
  if (cleanPath === 'blog') {
    const title = "PDF Guides & Privacy Tips Blog — OM PDF";
    const description = "Learn how to manage, edit, merge, and secure PDF files without compromising privacy. In-depth tutorials, tips, and step-by-step guides.";
    const keywords = "pdf guides, pdf tips, privacy tips, pdf how-to, local pdf editing, webassembly pdf";

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${BASE_URL}/blog` }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/blog">Blog</a></nav></div></header>
      <main style="max-width: 900px; margin: 40px auto; padding: 0 20px;">
        <h1>OM PDF Guides & Privacy Blog</h1>
        <p>Step-by-step tutorials on document security, client-side PDF manipulation, and productivity workflows.</p>
        <div class="blog-list" style="margin-top: 30px;">
          ${BLOG_POSTS.map(p => `
            <article style="margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2><a href="/blog/${p.slug}">${p.title}</a></h2>
              <p style="color: #64748b; font-size: 0.9rem;">Published: ${p.date} • ${p.readingTime}</p>
              <p>${p.description}</p>
              <a href="/blog/${p.slug}" style="color: #2563eb; font-weight: 600;">Read Guide →</a>
            </article>
          `).join('')}
        </div>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema], rootHTML };
  }

  // 3. Blog Post
  if (cleanPath.startsWith('blog/')) {
    const slug = cleanPath.substring(5);
    const post = BLOG_POSTS.find(p => p.slug === slug);
    if (post) {
      const title = `${post.title} — OM PDF Blog`;
      const description = post.description;
      const keywords = `pdf guide, how to, ${post.title.toLowerCase().replace(/[^a-z0-9]+/g, ', ')}`;

      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.description,
        "datePublished": post.date,
        "author": { "@type": "Person", "name": "OM Patil" },
        "publisher": { "@type": "Organization", "name": "OM PDF", "url": `${BASE_URL}/` },
        "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE_URL}/blog/${slug}` }
      };

      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${BASE_URL}/blog` },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": `${BASE_URL}/blog/${slug}` }
        ]
      };

      const rootHTML = `
        <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/blog">Blog</a></nav></div></header>
        <main style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
          <article>
            <nav style="font-size: 0.85rem; color: #64748b; margin-bottom: 16px;">
              <a href="/">Home</a> / <a href="/blog">Blog</a> / <span>${post.title}</span>
            </nav>
            <h1>${post.title}</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Published on ${post.date} • ${post.readingTime}</p>
            <p style="font-size: 1.1rem; line-height: 1.7; margin-top: 20px;">${post.description}</p>
            ${(post.sections || []).map(s => `
              <section style="margin-top: 28px;">
                <h2>${s.heading}</h2>
                <p style="line-height: 1.7; color: #334155;">${s.body}</p>
              </section>
            `).join('')}
          </article>
          <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 12px;">
            <h3>Try OM PDF Tools Free</h3>
            <p>Process your PDF files locally with complete privacy and zero uploads.</p>
            <a href="/merge-pdf" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Merge PDF Online →</a>
          </div>
        </main>
      `;

      return { title, description, keywords, schemas: [articleSchema, breadcrumbSchema], rootHTML };
    }
  }

  // 4. Tools Directory
  if (cleanPath === 'tools') {
    const title = "All Free Online PDF Tools Directory | OM PDF";
    const description = "Browse our comprehensive collection of 45+ free, offline-first PDF utilities. Merge, split, compress, protect, edit, sign, and convert PDF documents in your browser.";
    const keywords = "all pdf tools, pdf utilities list, offline pdf tools, free pdf editor directory, browser pdf tools";

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": "Tools", "item": `${BASE_URL}/tools` }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/blog">Blog</a></nav></div></header>
      <main style="max-width: 1100px; margin: 40px auto; padding: 0 20px;">
        <h1>All PDF Tools</h1>
        <p>Complete suite of free, private, browser-based document utilities. Zero uploads guaranteed.</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 30px;">
          ${TOOLS.map(t => `
            <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 12px; background: white;">
              <a href="${t.path}" style="text-decoration: none; color: inherit;">
                <h3 style="margin: 0 0 8px; color: #1e293b;">${t.icon} ${t.title}</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b;">${t.desc}</p>
              </a>
            </div>
          `).join('')}
        </div>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema], rootHTML };
  }

  // 5. About, Privacy, How It Works
  if (cleanPath === 'about') {
    const title = "About OM PDF — Free Privacy-First PDF Tools";
    const description = "Learn about the mission of OM PDF: building open-source, client-side, offline-first document utilities that protect privacy with zero server uploads.";
    const keywords = "about om pdf, client-side pdf, privacy first pdf, zero upload tools, om patil";

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": "About", "item": `${BASE_URL}/about` }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/about">About</a></nav></div></header>
      <main style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
        <h1>About OM PDF</h1>
        <p>OM PDF is a collection of browser-native PDF utilities created by OM Patil. Unlike standard web tools that upload confidential contracts and records to remote cloud servers, OM PDF processes your files entirely locally in your browser memory.</p>
        <h2>Our Privacy Architecture</h2>
        <p>Using WebAssembly and modern browser APIs, parsing, merging, splitting, and rendering happen on your device's CPU/GPU. Your files are never transmitted across the network, ensuring complete compliance with GDPR and HIPAA.</p>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema], rootHTML };
  }

  if (cleanPath === 'privacy') {
    const title = "Privacy Policy — Zero Server Uploads | OM PDF";
    const description = "OM PDF's privacy policy: 100% client-side processing, zero server storage, zero document transmission, and complete confidentiality.";
    const keywords = "privacy policy, no data collection, private pdf, local pdf processing, zero upload privacy";

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": "Privacy", "item": `${BASE_URL}/privacy` }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/privacy">Privacy</a></nav></div></header>
      <main style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
        <h1>Privacy Policy</h1>
        <p>At OM PDF, we believe your personal documents should remain personal. We do not operate document processing servers; everything runs locally in your web browser.</p>
        <h2>Zero Upload Guarantee</h2>
        <p>We do not collect, transmit, store, or view your PDF documents. All operations occur in client-side memory.</p>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema], rootHTML };
  }

  if (cleanPath === 'how-it-works') {
    const title = "How It Works — Offline Client-Side PDF Tools | OM PDF";
    const description = "Discover how OM PDF processes documents locally using WebAssembly, PDF-lib, PDF.js, and browser APIs with zero cloud latency.";
    const keywords = "how client side works, browser based tools, webassembly pdf, local file handling";

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": "How It Works", "item": `${BASE_URL}/how-it-works` }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/how-it-works">How It Works</a></nav></div></header>
      <main style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
        <h1>How OM PDF Works</h1>
        <p>OM PDF uses WebAssembly binaries and native browser APIs to manipulate PDF binary streams locally on your device without server communication.</p>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema], rootHTML };
  }

  // Competitor Alternative Pages
  if (cleanPath === 'ilovepdf-alternative' || cleanPath === 'smallpdf-alternative') {
    const isIlove = cleanPath === 'ilovepdf-alternative';
    const compName = isIlove ? 'iLovePDF' : 'Smallpdf';
    const title = isIlove
      ? "Best Free iLovePDF Alternative (100% Private, Zero Uploads) | OM PDF"
      : "Best Free Smallpdf Alternative with No Limits & Zero Uploads | OM PDF";
    const description = isIlove
      ? "Looking for a private iLovePDF alternative? OM PDF processes all files 100% locally in your browser with no file size limits, zero uploads, and no sign-up."
      : "Tired of Smallpdf daily limits and paywalls? Switch to OM PDF — the free, open, and 100% private browser-based PDF suite.";
    const keywords = `${compName.toLowerCase()} alternative, free ${compName.toLowerCase()} alternative, offline pdf editor, private pdf tools, no upload pdf merger`;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
        { "@type": "ListItem", "position": 2, "name": `${compName} Alternative`, "item": `${BASE_URL}/${cleanPath}` }
      ]
    };

    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": `OM PDF - ${compName} Alternative`,
      "url": `${BASE_URL}/${cleanPath}`,
      "description": description,
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "All",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Why is OM PDF a safer alternative to ${compName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Unlike ${compName}, which uploads your documents to remote cloud servers, OM PDF processes everything directly on your computer or mobile device in WebAssembly. Your files never touch a server.`
          }
        },
        {
          "@type": "Question",
          "name": "Does OM PDF have daily task limits?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. OM PDF provides unlimited free document tasks forever with zero paywalls or subscriptions."
          }
        }
      ]
    };

    const rootHTML = `
      <header class="navbar-v2"><div class="navbar-container"><a href="/">OM PDF</a> <nav><a href="/tools">Tools</a><a href="/blog">Blog</a></nav></div></header>
      <main style="max-width: 960px; margin: 40px auto; padding: 0 20px; font-family: system-ui, sans-serif;">
        <h1 style="font-size: 2.2rem; margin-bottom: 12px;">The 100% Private, Zero-Upload Alternative to ${compName}</h1>
        <p style="font-size: 1.1rem; color: #475569; line-height: 1.6;">Process PDFs directly on your device without uploading confidential documents to remote cloud servers. Completely free, no task limits, and fully offline.</p>
        
        <section style="margin: 36px 0;">
          <h2>Direct Feature Comparison: OM PDF vs ${compName}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Feature</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left; color: #2563eb;">OM PDF (Local)</th>
                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">${compName} (Cloud)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Data Privacy</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #10b981;">100% In-Browser (Zero Upload)</td><td style="padding: 12px; border: 1px solid #e2e8f0; color: #ef4444;">Uploads to remote servers</td></tr>
              <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Daily Usage Limits</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #10b981;">Unlimited Forever</td><td style="padding: 12px; border: 1px solid #e2e8f0; color: #ef4444;">Restricted / Paywalled</td></tr>
              <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Offline Mode</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #10b981;">Full PWA Offline Support</td><td style="padding: 12px; border: 1px solid #e2e8f0; color: #ef4444;">Requires constant internet</td></tr>
            </tbody>
          </table>
        </section>

        <section style="margin: 36px 0;">
          <h2>Popular Free Tools</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 14px;">
            <a href="/merge-pdf" style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #1e293b;"><strong>📑 Merge PDF</strong><br/><small style="color: #64748b;">Combine multiple files</small></a>
            <a href="/compress-pdf" style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #1e293b;"><strong>🗜️ Compress PDF</strong><br/><small style="color: #64748b;">Shrink file size</small></a>
            <a href="/draw-sign-pdf" style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #1e293b;"><strong>✍️ E-Sign PDF</strong><br/><small style="color: #64748b;">Sign documents</small></a>
            <a href="/chat-pdf" style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #1e293b;"><strong>🤖 Chat with PDF</strong><br/><small style="color: #64748b;">Local AI Q&amp;A</small></a>
          </div>
        </section>
      </main>
    `;

    return { title, description, keywords, schemas: [breadcrumbSchema, webAppSchema, faqSchema], rootHTML };
  }

  // 6. Tool Pages (e.g. merge-with-ranges, merge-pdf, compress-pdf, etc.)
  const tool = TOOLS.find(t => {
    const toolCleanPath = t.path.replace(/^\/|\/$/g, '');
    return toolCleanPath === cleanPath;
  });

  const toolMeta = getSeoMetadata(tool ? tool.key : cleanPath);
  const toolContent = getToolContent(tool ? tool.key : cleanPath);

  const title = toolMeta?.title || (tool ? `${tool.title} Online Free — OM PDF` : `${cleanPath} — OM PDF`);
  const description = toolMeta?.description || (tool ? `${tool.desc} 100% private, free, and runs entirely in your browser with zero uploads.` : `Free online PDF tool.`);
  const keywords = toolMeta?.keywords || (tool ? `${tool.title.toLowerCase()}, free online pdf tool, offline pdf, local browser pdf` : `pdf tools`);

  const schemas = buildToolSchemas({
    toolName: toolContent?.name || tool?.title || title,
    url: canonicalUrl,
    description: description,
    faqs: toolContent?.faqs || [],
    howTo: toolContent?.howTo || [
      { title: "Upload Files", text: `Drop your PDF files into the ${tool?.title || 'tool'} workspace.` },
      { title: "Configure Settings", text: "Adjust settings and options to your preference." },
      { title: "Process & Download", text: "Click the action button to process locally and download your file." }
    ]
  });

  // Render comprehensive semantic SSR HTML
  const relatedTools = TOOLS.filter(t => t.path.replace(/^\/|\/$/g, '') !== cleanPath).slice(0, 5);

  const rootHTML = `
    <header class="navbar-v2">
      <div class="navbar-container">
        <a href="/" class="brand-link"><strong>OM PDF</strong></a>
        <nav>
          <a href="/tools">All Tools</a>
          <a href="/about">About</a>
          <a href="/blog">Blog</a>
        </nav>
      </div>
    </header>

    <main class="tool-page-container" style="max-width: 1000px; margin: 30px auto; padding: 0 20px;">
      <nav aria-label="Breadcrumb" style="font-size: 0.85rem; color: #64748b; margin-bottom: 16px;">
        <a href="/" style="color: inherit; text-decoration: none;">Home</a> / 
        <a href="/tools" style="color: inherit; text-decoration: none;">Tools</a> / 
        <span style="color: #1e293b; font-weight: 600;">${toolContent?.name || tool?.title || cleanPath}</span>
      </nav>

      <section class="tool-hero" style="margin-bottom: 24px;">
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #0f172a; margin: 0 0 10px;">${toolContent?.name || tool?.title || cleanPath}</h1>
        <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin: 0;">${toolContent?.headline || description}</p>
      </section>

      <div class="tool-workspace-preview" style="padding: 40px 20px; border: 2px dashed #cbd5e1; border-radius: 16px; background: #f8fafc; text-align: center; margin-bottom: 30px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">${tool?.icon || '📄'}</div>
        <h2 style="font-size: 1.3rem; margin: 0 0 8px; color: #1e293b;">Drag and Drop PDF files here</h2>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 16px;">Fast, 100% private in-browser processing. Your files never leave your device.</p>
        <button style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer;">
          Select PDF File
        </button>
      </div>

      ${toolContent?.description ? `
        <section class="tool-overview" style="margin-bottom: 30px; line-height: 1.7; color: #334155; font-size: 1.02rem;">
          <p>${toolContent.description}</p>
        </section>
      ` : ''}

      ${toolContent?.syntaxGuide ? `
        <section class="tool-syntax-guide" style="margin-bottom: 30px; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="font-size: 1.25rem; margin-top: 0; color: #0f172a;">${toolContent.syntaxGuide.title}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px;">
            ${toolContent.syntaxGuide.examples.map(ex => `
              <div style="padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <code style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${ex.syntax}</code>
                <p style="margin: 6px 0 0; font-size: 0.88rem; color: #475569;">${ex.desc}</p>
              </div>
            `).join('')}
          </div>
          ${toolContent.syntaxGuide.tip ? `<p style="margin-top: 14px; font-size: 0.88rem; color: #64748b; font-style: italic;">💡 ${toolContent.syntaxGuide.tip}</p>` : ''}
        </section>
      ` : ''}

      ${toolContent?.howTo && toolContent.howTo.length > 0 ? `
        <section class="tool-howto" style="margin-bottom: 30px;">
          <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 16px;">How to use ${toolContent.name}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            ${toolContent.howTo.map((step, idx) => `
              <div style="padding: 18px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; margin-bottom: 10px;">${idx + 1}</div>
                <h3 style="font-size: 1rem; margin: 0 0 6px; color: #0f172a;">${step.title}</h3>
                <p style="margin: 0; font-size: 0.88rem; color: #64748b; line-height: 1.5;">${step.text}</p>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${toolContent?.useCases && toolContent.useCases.length > 0 ? `
        <section class="tool-usecases" style="margin-bottom: 30px;">
          <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 16px;">Practical Use Cases</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            ${toolContent.useCases.map(uc => `
              <div style="padding: 16px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h3 style="font-size: 1rem; margin: 0 0 6px; color: #0f172a;">${uc.title}</h3>
                <p style="margin: 0; font-size: 0.88rem; color: #64748b; line-height: 1.5;">${uc.text}</p>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${toolContent?.sections && toolContent.sections.length > 0 ? `
        <section class="tool-features" style="margin-bottom: 30px;">
          <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 16px;">Key Features & Capabilities</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            ${toolContent.sections.map(sec => `
              <div style="padding: 18px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h3 style="font-size: 1.05rem; margin: 0 0 8px; color: #0f172a;">${sec.title}</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.6;">${sec.body}</p>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${toolContent?.faqs && toolContent.faqs.length > 0 ? `
        <section class="tool-faqs" style="margin-bottom: 30px;">
          <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 16px;">Frequently Asked Questions</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
            ${toolContent.faqs.map(faq => `
              <div style="padding: 18px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h3 style="font-size: 1rem; margin: 0 0 8px; color: #0f172a;">${faq.q}</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.6;">${faq.a}</p>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <section class="tool-privacy-guarantee" style="margin-bottom: 30px; padding: 20px; background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.15); border-radius: 12px;">
        <h2 style="font-size: 1.15rem; color: #2563eb; margin: 0 0 6px;">🔒 100% Client-Side Privacy Guarantee</h2>
        <p style="margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.6;">
          OM PDF processes all documents entirely in your web browser memory using WebAssembly. Your files are never uploaded to any cloud server, preventing data leakage and guaranteeing total security for confidential documents.
        </p>
      </section>

      <section class="related-tools" style="margin-bottom: 40px;">
        <h2 style="font-size: 1.2rem; color: #0f172a; margin-bottom: 12px;">Related PDF Tools</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${relatedTools.map(t => `
            <a href="${t.path}" style="padding: 8px 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #1e293b; font-size: 0.88rem; font-weight: 600;">
              ${t.icon} ${t.title}
            </a>
          `).join('')}
        </div>
      </section>
    </main>

    <footer style="border-top: 1px solid #e2e8f0; padding: 30px 20px; text-align: center; font-size: 0.85rem; color: #64748b;">
      <p>© ${new Date().getFullYear()} OM PDF. Fast, free, client-side PDF tools by <strong>OM Patil</strong>.</p>
    </footer>
  `;

  return { title, description, keywords, schemas, rootHTML };
}

run();
