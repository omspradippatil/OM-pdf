import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const indexHtmlPath = path.resolve(__dirname, '../dist/index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error("dist/index.html not found. Run 'npm run build' first.");
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

  console.log(`Found ${urls.length} URLs in sitemap to prerender.`);

  // Dynamically import constants
  const seoModule = await import('../src/constants/seoMetadata.js');
  const SEO_METADATA = seoModule.SEO_METADATA;

  const toolsModule = await import('../src/constants/tools.js');
  const TOOLS = toolsModule.TOOLS;

  const blogModule = await import('../src/constants/blogPosts.js');
  const BLOG_POSTS = blogModule.BLOG_POSTS;

  let count = 0;

  for (const urlStr of urls) {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    
    // Normalize path to clean relative path (e.g. '', 'merge-pdf', 'blog/how-to-merge-pdf-without-upload')
    const cleanPath = pathname.replace(/^\/|\/$/g, '');
    const isHome = cleanPath === '';
    
    const pageMeta = getMetadataAndContent(cleanPath, SEO_METADATA, TOOLS, BLOG_POSTS);
    if (!pageMeta) {
      console.warn(`⚠️ Warning: No metadata resolver found for path: ${pathname}`);
      continue;
    }

    const { title, description, keywords, canonicalUrl, rootHTML } = pageMeta;

    let html = indexHtmlContent;

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    
    // Replace Description
    html = html.replace(
      /<meta name="description" content=".*?" \/>/s,
      `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
    );

    // Replace Keywords
    html = html.replace(
      /<meta name="keywords" content=".*?" \/>/s,
      `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />`
    );

    // Inject canonical and OG tags before </head>
    const tagsToInject = `
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
`;
    html = html.replace('</head>', tagsToInject + '</head>');

    // Inject static crawler HTML into #root
    html = html.replace('<div id="root"></div>', `<div id="root">${rootHTML}</div>`);

    if (isHome) {
      // Write home index.html directly to dist/index.html
      fs.writeFileSync(indexHtmlPath, html);
      console.log(`Generated home page: dist/index.html`);
    } else {
      // Write custom route page
      const routeDir = path.resolve(__dirname, '../dist', cleanPath);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.resolve(routeDir, 'index.html'), html);
      console.log(`Generated route page: dist/${cleanPath}/index.html`);
    }
    count++;
  }

  console.log(`\n✅ SEO Prerender Complete: Generated static index.html for ${count} routes.`);
}

function getMetadataAndContent(cleanPath, SEO_METADATA, TOOLS, BLOG_POSTS) {
  // 1. Home Page
  if (cleanPath === '') {
    const title = "Free PDF Tools Online | Merge, Split, Compress, Convert PDF";
    const description = "Merge PDF, split PDF, compress PDF, convert PDF to JPG and add page numbers — all free, private and instant in your browser. No upload. No sign-up.";
    const keywords = "pdf tools, free pdf editor, merge pdf, split pdf, compress pdf, convert pdf, pdf to jpg, online pdf tools, free pdf converter";
    const url = "https://om-pdf.netlify.app/";
    
    let rootHTML = `
      <h1>OM PDF — Free Privacy-First PDF Tools</h1>
      <p>OM PDF is a collection of free, offline-first PDF utilities. All tools process your files directly in your web browser, meaning your sensitive documents are never uploaded to any server.</p>
      <h2>Available PDF Tools:</h2>
      <ul>
    `;
    for (const tool of TOOLS) {
      rootHTML += `        <li><a href="${tool.path}/">${tool.title}</a>: ${tool.desc}</li>\n`;
    }
    rootHTML += `      </ul>
      <h2>Latest Privacy & PDF Guides:</h2>
      <ul>
    `;
    for (const post of BLOG_POSTS) {
      rootHTML += `        <li><a href="/blog/${post.slug}/">${post.title}</a>: ${post.description}</li>\n`;
    }
    rootHTML += `      </ul>`;
    
    return { title, description, keywords, canonicalUrl: url, rootHTML };
  }

  // 2. Blog index page
  if (cleanPath === 'blog') {
    const title = "PDF Guides & Privacy Tips Blog — OM PDF";
    const description = "Learn how to manage, edit, merge, and secure PDF files without compromising privacy. Guides, tips, and step-by-step instructions.";
    const keywords = "pdf guides, pdf tips, privacy tips, pdf how-to, local pdf editing";
    const url = "https://om-pdf.netlify.app/";
    
    let rootHTML = `
      <h1>OM PDF Blog — Guides & Privacy Tips</h1>
      <p>Our blog offers tutorials on managing PDF files securely, preserving document privacy, and using browser-native tools.</p>
      <h2>All Blog Articles:</h2>
      <ul>
    `;
    for (const post of BLOG_POSTS) {
      rootHTML += `
        <li>
          <a href="/blog/${post.slug}/"><strong>${post.title}</strong></a> (Published: ${post.date})
          <p>${post.description}</p>
        </li>
      `;
    }
    rootHTML += `      </ul>`;
    
    return { title, description, keywords, canonicalUrl: url, rootHTML };
  }

  // 3. Blog post
  if (cleanPath.startsWith('blog/')) {
    const slug = cleanPath.substring(5); // remove 'blog/'
    const post = BLOG_POSTS.find(p => p.slug === slug);
    if (post) {
      const title = `${post.title} — OM PDF Blog`;
      const description = post.description;
      const keywords = `how to, pdf guide, offline pdf, ${post.title.toLowerCase().replace(/[^a-z0-9]+/g, ', ')}`;
      const url = `https://om-pdf.netlify.app/${slug}/`;
      
      let rootHTML = `
        <article>
          <h1>${post.title}</h1>
          <p><strong>Published on:</strong> ${post.date} | <strong>Reading Time:</strong> ${post.readingTime}</p>
          <p>${post.description}</p>
      `;
      if (post.sections) {
        for (const section of post.sections) {
          rootHTML += `
            <h2>${section.heading}</h2>
            <p>${section.body}</p>
          `;
        }
      }
      rootHTML += `
        </article>
        <p><a href="/blog/">Back to all blog posts</a></p>
      `;
      
      return { title, description, keywords, canonicalUrl: url, rootHTML };
    }
  }

  // 4. Tools directory list
  if (cleanPath === 'tools') {
    const title = "All PDF Tools Directory — OM PDF";
    const description = "Browse all free offline-first PDF tools. Merge, split, compress, protect, rotate, convert, and sign PDF files directly on your computer.";
    const keywords = "pdf tools list, offline pdf tools directory, convert pdf list, edit pdf list";
    const url = "https://om-pdf.netlify.app/";
    
    let rootHTML = `
      <h1>OM PDF Tools Directory</h1>
      <p>Browse our complete list of offline-first PDF utilities. All tools process your files directly in your web browser.</p>
      <ul>
    `;
    for (const tool of TOOLS) {
      rootHTML += `        <li><a href="${tool.path}/">${tool.title}</a>: ${tool.desc}</li>\n`;
    }
    rootHTML += `      </ul>`;
    
    return { title, description, keywords, canonicalUrl: url, rootHTML };
  }

  // 5. Generic content pages
  if (cleanPath === 'about') {
    return {
      title: "About OM PDF — Privacy-First PDF Toolkit",
      description: "Learn about the mission of OM PDF to build open-source, offline-first, client-side PDF utilities that respect document privacy.",
      keywords: "about om pdf, client-side pdf, privacy first pdf, browser native tools",
      canonicalUrl: "https://om-pdf.netlify.app/",
      rootHTML: `
        <h1>About OM PDF</h1>
        <p>OM PDF is a collection of browser-native PDF utilities. Unlike typical online PDF editors that upload your sensitive documents to remote servers, OM PDF processes your files entirely locally on your device.</p>
        <h2>Our Privacy Promise</h2>
        <p>Your documents never leave your computer. We use browser APIs and client-side WebAssembly to perform all merging, splitting, compression, and conversions.</p>
      `
    };
  }

  if (cleanPath === 'privacy') {
    return {
      title: "Privacy Policy — OM PDF",
      description: "Read our privacy policy. We have zero servers for processing documents; 100% of PDF processing happens offline in your browser.",
      keywords: "privacy policy, no data collection, private pdf, local pdf processing",
      canonicalUrl: "https://om-pdf.netlify.app/",
      rootHTML: `
        <h1>Privacy Policy</h1>
        <p>At OM PDF, we prioritize your privacy. This privacy policy describes how we do NOT collect or store your personal documents.</p>
        <h2>Zero Uploads</h2>
        <p>All PDF operations are carried out client-side. We do not upload, transmit, or save any of your PDF files on our servers.</p>
      `
    };
  }

  if (cleanPath === 'how-it-works') {
    return {
      title: "How It Works — Offline Client-Side PDF Tools | OM PDF",
      description: "Learn about the technology powering OM PDF — WebAssembly and browser APIs that process PDFs entirely on your device.",
      keywords: "how client side works, browser based tools, webassembly pdf, local file handling",
      canonicalUrl: "https://om-pdf.netlify.app/",
      rootHTML: `
        <h1>How It Works</h1>
        <p>OM PDF uses modern web technology to process files entirely in your browser.</p>
        <h2>WebAssembly & Local APIs</h2>
        <p>By compiling PDF libraries to WebAssembly, your browser is able to handle document merging, page extraction, and compression directly. This ensures fast speed and total privacy.</p>
      `
    };
  }

  // 6. Tool Pages (e.g. merge-pdf, compress-pdf, pdf-to-word)
  // Let's find a tool that matches this path or key
  const tool = TOOLS.find(t => {
    const toolCleanPath = t.path.replace(/^\/|\/$/g, '');
    return toolCleanPath === cleanPath;
  });

  if (tool) {
    // Check if we have SEO metadata in SEO_METADATA
    let meta = SEO_METADATA[tool.key];
    if (!meta) {
      // Try to find by matching url
      meta = Object.values(SEO_METADATA).find(m => {
        try {
          const mPath = new URL(m.url).pathname.replace(/^\/|\/$/g, '');
          return mPath === cleanPath;
        } catch {
          return false;
        }
      });
    }

    const title = meta?.title || `${tool.title} Online Free — OM PDF`;
    const description = meta?.description || `${tool.desc} 100% private, free, and runs entirely in your browser. No registration required.`;
    const keywords = meta?.keywords || `${tool.title.toLowerCase()}, free online pdf tool, offline pdf, local browser pdf`;
    const url = meta?.url || `https://om-pdf.netlify.app/${tool.path}/`;
    
    const rootHTML = `
      <h1>${tool.title}</h1>
      <p>${tool.desc}</p>
      <h2>How to use ${tool.title}:</h2>
      <ol>
        <li>Drag and drop your PDF files into the secure browser window, or click Browse.</li>
        <li>Configure the settings (e.g., page order, compression strength, file output).</li>
        <li>Click the action button. The processed file will download immediately.</li>
      </ol>
      <p><strong>Security Note:</strong> This tool runs 100% locally. Your files never leave your device.</p>
    `;
    
    return { title, description, keywords, canonicalUrl: url, rootHTML };
  }

  // 7. Fallback if not matched (e.g. standard pages like my-files)
  return {
    title: `${cleanPath.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} — OM PDF`,
    description: `OM PDF is a collection of browser-native client-side PDF utilities.`,
    keywords: `pdf tools, privacy first pdf, offline pdf`,
    canonicalUrl: `https://om-pdf.netlify.app/${cleanPath}/`,
    rootHTML: `
      <h1>${cleanPath.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h1>
      <p>This page is part of the client-side OM PDF application. Please load the application in a modern browser.</p>
    `
  };
}

run();
