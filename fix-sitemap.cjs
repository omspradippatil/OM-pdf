const fs = require('fs');
let sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');

// Replace all domains
sitemap = sitemap.replace(/https:\/\/om-pdf\.pages\.dev/g, 'https://om-pdf.netlify.app');

// Strip trailing slashes, except for the root domain
// Match <loc>https://om-pdf.netlify.app/something/</loc>
// Replace with <loc>https://om-pdf.netlify.app/something</loc>
sitemap = sitemap.replace(/<loc>https:\/\/om-pdf\.netlify\.app\/([^<]+)\/<\/loc>/g, '<loc>https://om-pdf.netlify.app/$1</loc>');

fs.writeFileSync('public/sitemap.xml', sitemap);
console.log('Fixed sitemap.xml');
