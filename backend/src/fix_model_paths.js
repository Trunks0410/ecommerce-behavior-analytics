import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;
const modulesDir = path.join(srcDir, 'modules');

function replaceModelImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  content = content.replace(/from "\.\.\/models\/index\.js"/g, 'from "../../database/models/index.js"');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed model imports in ${filePath}`);
  }
}

const moduleFolders = fs.readdirSync(modulesDir);
moduleFolders.forEach(folder => {
  const fullFolder = path.join(modulesDir, folder);
  if (fs.statSync(fullFolder).isDirectory()) {
    const files = fs.readdirSync(fullFolder);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        replaceModelImports(path.join(fullFolder, file));
      }
    });
  }
});
