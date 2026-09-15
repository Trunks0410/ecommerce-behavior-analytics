import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;
const servicesDir = path.join(srcDir, 'services');
const apiDir = path.join(srcDir, 'shared', 'api');

if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir);

const oldAxios = path.join(servicesDir, 'axiosClient.ts');
const newAxios = path.join(apiDir, 'axiosClient.ts');

if (fs.existsSync(oldAxios)) {
  fs.renameSync(oldAxios, newAxios);
  console.log('Moved axiosClient.ts');
  
  // Update all services
  const files = fs.readdirSync(servicesDir);
  files.forEach(file => {
    if (file.endsWith('.ts')) {
      const filePath = path.join(servicesDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      content = content.replace(/from "\.\/axiosClient"/g, 'from "@/shared/api/axiosClient"');
      content = content.replace(/from '\.\/axiosClient'/g, 'from "@/shared/api/axiosClient"');
      
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  });
  console.log('Updated imports for axiosClient in services');
}
