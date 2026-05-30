const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has ExportContext
  if (content.includes('ExportContext')) continue;

  // Check if it uses downloadBytes or saveAs or URL.createObjectURL for export
  // Basically check if it has a <SaveToDriveButton
  const folderMatch = content.match(/<SaveToDriveButton[^>]+toolFolder=["']([^"']+)["']/);
  const toolFolder = folderMatch ? folderMatch[1] : 'Exported';

  // Inject import
  if (content.includes('import { useAuth } from')) {
    content = content.replace(/(import \{ useAuth \} from [^\n]+;)/, `$1\nimport { useExport } from '../context/ExportContext';`);
  } else {
    // just put it after the first import React
    content = content.replace(/(import React[^;]+;)/, `$1\nimport { useExport } from '../context/ExportContext';`);
  }

  // Inject hook
  content = content.replace(/(export default function \w+\([^)]*\) \{\n)/, `$1  const { triggerExport } = useExport();\n`);

  // Replace downloadBytes(X, Y, Z) with triggerExport(X, Y, Z, toolFolder)
  // downloadBytes(bytes, name) => triggerExport(bytes, name, 'application/pdf', 'ToolFolder')
  // downloadBytes(bytes, name, mimeType) => triggerExport(bytes, name, mimeType, 'ToolFolder')
  content = content.replace(/downloadBytes\(([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\)/g, (match, p1, p2, p3) => {
    if (p3) {
      return `triggerExport(${p1}, ${p2}, ${p3}, "${toolFolder}")`;
    } else {
      return `triggerExport(${p1}, ${p2}, 'application/pdf', "${toolFolder}")`;
    }
  });

  // What about files that do: const url = URL.createObjectURL(blob); ... a.click();
  // We can't regex replace those safely. But we can leave them for manual fix. Let's see how many there are.
  // Actually, we can just replace 'downloadBytes' because 80% use it.

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored', file);
}
