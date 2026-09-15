import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;
const modulesDir = path.join(srcDir, 'modules');

function replaceServiceImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace vnpayService
  content = content.replace(/from "\.\.\/services\/vnpayService\.js"/g, 'from "../payment/vnpay.service.js"');
  
  // Replace activityLogService
  content = content.replace(/from "\.\.\/services\/activityLogService\.js"/g, 'from "../system/activityLog.service.js"');
  
  // Replace shipperService in shipper.controller.js
  if (filePath.endsWith('shipper.controller.js')) {
    content = content.replace(/from "\.\.\/services\/shipperService\.js"/g, 'from "./shipper.service.js"');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed service imports in ${filePath}`);
  }
}

const moduleFolders = fs.readdirSync(modulesDir);
moduleFolders.forEach(folder => {
  const fullFolder = path.join(modulesDir, folder);
  if (fs.statSync(fullFolder).isDirectory()) {
    const files = fs.readdirSync(fullFolder);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        replaceServiceImports(path.join(fullFolder, file));
      }
    });
  }
});
