import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const docs = path.join(root, 'docs');

if (fs.existsSync(dist)) {
  // Exclude unused chat-attachment screenshots from production deployment bundles
  const distAiStudioAssets = path.join(dist, 'assets', 'aistudio');
  if (fs.existsSync(distAiStudioAssets)) {
    fs.rmSync(distAiStudioAssets, { recursive: true, force: true });
  }

  fs.rmSync(docs, { recursive: true, force: true });
  fs.cpSync(dist, docs, { recursive: true });

  console.log('Successfully synced dist -> docs for GitHub Pages deploy');
} else {
  console.warn('dist folder not found to copy to docs');
}
