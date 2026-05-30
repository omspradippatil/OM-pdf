const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the invalid function syntax that was created
  content = content.replace(/function triggerExport\([^)]+\)\s*\{\s*const\s+url\s*=\s*URL\.createObjectURL[\s\S]*?setTimeout[^}]+\}\s*\}/, '');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Done cleaning up');
