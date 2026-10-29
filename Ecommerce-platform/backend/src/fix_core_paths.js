import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;
const modulesDir = path.join(srcDir, 'modules');

function updateRelativeCorePaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // In modules/xxx/xxx.js:
  // from "../core/middleware/..." should become from "../../core/middleware/..."
  // from "../core/config/..." should become from "../../core/config/..."
  // from "../core/utils/..." should become from "../../core/utils/..."
  
  content = content.replace(/from "\.\.\/core\//g, 'from "../../core/');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed paths in ${filePath}`);
  }
}

const moduleFolders = fs.readdirSync(modulesDir);
moduleFolders.forEach(folder => {
  const fullFolder = path.join(modulesDir, folder);
  if (fs.statSync(fullFolder).isDirectory()) {
    const files = fs.readdirSync(fullFolder);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        updateRelativeCorePaths(path.join(fullFolder, file));
      }
    });
  }
});
