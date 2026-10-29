import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;

const sharedDir = path.join(srcDir, 'shared');
const appDir = path.join(srcDir, 'app');

if (!fs.existsSync(sharedDir)) fs.mkdirSync(sharedDir);
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir);

// 1. Move to shared
const sharedFolders = ['components', 'utils', 'types', 'services/api'];
sharedFolders.forEach(folder => {
  if (folder.includes('/')) {
    // Handling nested like services/api
    const oldPath = path.join(srcDir, folder);
    const newPath = path.join(sharedDir, path.basename(folder));
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`Moved ${folder} to shared/${path.basename(folder)}`);
    }
  } else {
    const oldPath = path.join(srcDir, folder);
    const newPath = path.join(sharedDir, folder);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`Moved ${folder} to shared/${folder}`);
    }
  }
});

// 2. Move to app
const appItems = ['stores', 'styles', 'App.tsx', 'routes.tsx'];
appItems.forEach(item => {
  const oldPath = path.join(srcDir, item);
  const newPath = path.join(appDir, item);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${item} to app/${item}`);
  }
});

// 3. Update all imports in src/**/*.ts, src/**/*.tsx
function replaceImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace alias imports
  content = content.replace(/@\/components\//g, '@/shared/components/');
  content = content.replace(/@\/utils\//g, '@/shared/utils/');
  content = content.replace(/@\/types\//g, '@/shared/types/');
  content = content.replace(/@\/stores\//g, '@/app/stores/');
  content = content.replace(/@\/styles\//g, '@/app/styles/');

  // For routes.tsx / App.tsx internal relative imports if any
  if (filePath.endsWith('main.tsx')) {
    content = content.replace(/from "\.\/App"/g, 'from "./app/App"');
    content = content.replace(/from '\.\/App'/g, "from './app/App'");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated imports in ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      replaceImports(fullPath);
    }
  });
}

walkDir(srcDir);
