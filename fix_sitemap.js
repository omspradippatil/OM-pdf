import fs from 'node:fs';

const sourcePath = 'public/sitemap_final.xml';
const canonicalPath = 'public/sitemap.xml';

const xml = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');

fs.writeFileSync(sourcePath, xml, 'utf8');
fs.writeFileSync(canonicalPath, xml, 'utf8');

console.log(`Wrote ${sourcePath} and ${canonicalPath} without a BOM.`);
