import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;

const directoriesToScan = ['services', 'routes', 'controllers', '.'];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace imports like: import { ... } from "../core/middleware/..."
  // with import { ... } from "../core/middleware/..."
  
  if (path.basename(filePath) === 'app.js' || path.basename(filePath) === 'worker.js') {
    content = content.replace(/from "\.\/config\//g, 'from "./core/config/');
    content = content.replace(/from "\.\/middleware\//g, 'from "./core/middleware/');
    content = content.replace(/from "\.\/utils\//g, 'from "./core/utils/');
  } else {
    content = content.replace(/from "\.\.\/config\//g, 'from "../core/config/');
    content = content.replace(/from "\.\.\/middleware\//g, 'from "../core/middleware/');
    content = content.replace(/from "\.\.\/utils\//g, 'from "../core/utils/');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

directoriesToScan.forEach(dir => {
  const fullDir = path.join(srcDir, dir);
  if (!fs.existsSync(fullDir)) return;
  
  const files = fs.readdirSync(fullDir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      replaceInFile(path.join(fullDir, file));
    }
  });
});
