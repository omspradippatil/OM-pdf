const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let newLines = [];
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('function triggerExport(')) {
      inFunc = true;
    }
    if (!inFunc) {
      newLines.push(lines[i]);
    } else {
      if (lines[i] === '}') {
        inFunc = false;
      }
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
}
console.log('Cleaned up triggerExport declarations');
