import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;
const modulesDir = path.join(srcDir, 'modules');

function fixCrossServiceImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace import xxxService from "./xxxService.js"
  // with import xxxService from "../xxx/xxx.service.js"
  content = content.replace(/from "\.\/([a-zA-Z0-9]+)Service\.js"/g, (match, moduleName) => {
    return `from "../${moduleName}/${moduleName}.service.js"`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed cross-service imports in ${filePath}`);
  }
}

const moduleFolders = fs.readdirSync(modulesDir);
moduleFolders.forEach(folder => {
  const fullFolder = path.join(modulesDir, folder);
  if (fs.statSync(fullFolder).isDirectory()) {
    const files = fs.readdirSync(fullFolder);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        fixCrossServiceImports(path.join(fullFolder, file));
      }
    });
  }
});
