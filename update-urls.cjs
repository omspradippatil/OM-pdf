const fs = require('fs');
let content = fs.readFileSync('src/constants/seoMetadata.js', 'utf8');
content = content.replace(/https:\/\/om-pdf\.pages\.dev\/?/g, 'https://om-pdf.netlify.app/');
content = content.replace(/https:\/\/om-pdf\.netlify\.app\/([a-zA-Z0-9-]+)\//g, 'https://om-pdf.netlify.app/$1');
fs.writeFileSync('src/constants/seoMetadata.js', content);
