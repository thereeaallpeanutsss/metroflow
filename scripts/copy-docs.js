import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const docs = path.join(root, 'docs');

if (fs.existsSync(dist)) {
  fs.rmSync(docs, { recursive: true, force: true });
  fs.cpSync(dist, docs, { recursive: true });

  // Clean docs/index.html: Ensure compiled production bundle never attempts redirecting to /docs/
  const docsIndex = path.join(docs, 'index.html');
  if (fs.existsSync(docsIndex)) {
    let content = fs.readFileSync(docsIndex, 'utf-8');
    content = content.replace(/\/\/ If GitHub Pages is deployed from root[\s\S]*?return;\s*\}/g, '');
    fs.writeFileSync(docsIndex, content, 'utf-8');
  }

  // Also clean dist/index.html
  const distIndex = path.join(dist, 'index.html');
  if (fs.existsSync(distIndex)) {
    let content = fs.readFileSync(distIndex, 'utf-8');
    content = content.replace(/\/\/ If GitHub Pages is deployed from root[\s\S]*?return;\s*\}/g, '');
    fs.writeFileSync(distIndex, content, 'utf-8');
  }

  console.log('Successfully synced dist -> docs for GitHub Pages deploy');
} else {
  console.warn('dist folder not found to copy to docs');
}
