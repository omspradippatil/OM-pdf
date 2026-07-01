const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('om-pdf.pages.dev')) {
    content = content.replace(/https:\/\/om-pdf\.pages\.dev/g, 'https://om-pdf.netlify.app');
    content = content.replace(/om-pdf\.pages\.dev/g, 'om-pdf.netlify.app');
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(js|jsx|html|md)$/.test(fullPath)) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('src');
walkDir('cf-worker');
replaceInFile('index.html');
replaceInFile('README.md');
replaceInFile('SEO_IMPLEMENTATION_GUIDE.js');
replaceInFile('SEO_ROADMAP.md');
replaceInFile('SEO_SUMMARY.md');
