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

  // Dynamically import SEO metadata
  const seoModule = await import('../src/constants/seoMetadata.js');
  const SEO_METADATA = seoModule.SEO_METADATA;

  let count = 0;
  for (const [key, meta] of Object.entries(SEO_METADATA)) {
    if (key === 'home') continue;
    
    // e.g. "https://om-pdf.pages.dev/merge-pdf"
    let routeName = meta.url.split('/').pop();
    if (!routeName) continue;
    
    const routeDir = path.resolve(__dirname, '../dist', routeName);
    
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    
    let html = indexHtmlContent;
    
    // Replace <title>
    html = html.replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`);
    
    // Inject custom meta tags before </head>
    const tagsToInject = `
  <meta name="description" content="${meta.description.replace(/"/g, '&quot;')}" />
  <meta name="keywords" content="${meta.keywords.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="${meta.url}" />
  <meta property="og:title" content="${meta.title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${meta.description.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${meta.url}" />
  <meta name="twitter:title" content="${meta.title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${meta.description.replace(/"/g, '&quot;')}" />
`;
    html = html.replace('</head>', tagsToInject + '</head>');
    
    fs.writeFileSync(path.resolve(routeDir, 'index.html'), html);
    count++;
  }
  console.log(`\n✅ SEO Prerender Complete: Generated static index.html for ${count} routes.`);
}

run();
