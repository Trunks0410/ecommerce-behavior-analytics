import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = __dirname;

const modulesDir = path.join(srcDir, 'modules');
if (!fs.existsSync(modulesDir)) fs.mkdirSync(modulesDir);

// Get all routes to determine modules
const routesDir = path.join(srcDir, 'routes');
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && f !== 'index.js');
  
  routeFiles.forEach(routeFile => {
    // Determine module name, e.g., authRoute.js -> auth, shipmentRoutes.js -> shipment
    let moduleName = routeFile.replace(/Routes?\.js$/, '');
    const modulePath = path.join(modulesDir, moduleName);
    
    if (!fs.existsSync(modulePath)) fs.mkdirSync(modulePath);

    // Paths
    const oldRoute = path.join(routesDir, routeFile);
    const newRoute = path.join(modulePath, `${moduleName}.routes.js`);
    
    const oldController = path.join(srcDir, 'controllers', `${moduleName}Controller.js`);
    const newController = path.join(modulePath, `${moduleName}.controller.js`);
    
    const oldService = path.join(srcDir, 'services', `${moduleName}Service.js`);
    const newService = path.join(modulePath, `${moduleName}.service.js`);

    // Move Route
    if (fs.existsSync(oldRoute)) {
      let content = fs.readFileSync(oldRoute, 'utf-8');
      // Update controller import
      content = content.replace(new RegExp(`from "\\.\\./controllers/${moduleName}Controller\\.js"`), `from "./${moduleName}.controller.js"`);
      fs.writeFileSync(newRoute, content, 'utf-8');
      fs.unlinkSync(oldRoute);
    }

    // Move Controller
    if (fs.existsSync(oldController)) {
      let content = fs.readFileSync(oldController, 'utf-8');
      // Update service import
      content = content.replace(new RegExp(`from "\\.\\./services/${moduleName}Service\\.js"`), `from "./${moduleName}.service.js"`);
      fs.writeFileSync(newController, content, 'utf-8');
      fs.unlinkSync(oldController);
    }

    // Move Service
    if (fs.existsSync(oldService)) {
      let content = fs.readFileSync(oldService, 'utf-8');
      // Update model import (models moved to ../database/models soon, or ../../models for now)
      // Actually we will rename 'models' to 'database' in phase 2 later, but let's change path to ../../database/models
      content = content.replace(/from "\.\.\/models\/index\.js"/g, `from "../../database/models/index.js"`);
      // Update auth helpers if any
      content = content.replace(/from "\.\.\/utils\//g, `from "../../core/utils/`);
      fs.writeFileSync(newService, content, 'utf-8');
      fs.unlinkSync(oldService);
    }
    
    console.log(`Migrated module: ${moduleName}`);
  });
}

// Update routes/index.js
const routesIndex = path.join(routesDir, 'index.js');
if (fs.existsSync(routesIndex)) {
  let content = fs.readFileSync(routesIndex, 'utf-8');
  // import authRoute from "./authRoute.js" -> import authRoute from "../modules/auth/auth.routes.js"
  content = content.replace(/from "\.\/([a-zA-Z0-9]+)Routes?\.js"/g, (match, moduleName) => {
    return `from "../modules/${moduleName}/${moduleName}.routes.js"`;
  });
  fs.writeFileSync(routesIndex, content, 'utf-8');
  console.log(`Updated routes/index.js`);
}

// Ensure database/models exists and move models
const oldModelsDir = path.join(srcDir, 'models');
const dbDir = path.join(srcDir, 'database');
const newModelsDir = path.join(dbDir, 'models');

if (fs.existsSync(oldModelsDir) && !fs.existsSync(newModelsDir)) {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
  fs.renameSync(oldModelsDir, newModelsDir);
  console.log(`Moved models to database/models`);
}
