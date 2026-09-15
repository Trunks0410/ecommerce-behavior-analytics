const fs = require('fs');
const path = require('path');

function extractBulkInsert(filePath, tableName) {
  const code = fs.readFileSync(filePath, 'utf8');
  // We look for: await queryInterface.bulkInsert("tableName", [ ... ])
  const regex = new RegExp(`await queryInterface\\.bulkInsert\\(['"\`]${tableName}['"\`]\\s*,\\s*(\\[[\\s\\S]*?\\])\\s*(,\\s*\\{.*?\\})?\\s*\\);`);
  const match = code.match(regex);
  if (!match) return null;
  const arrayStr = match[1];
  
  // To parse this JS array, we can use eval since it's just JS code
  // We need to provide 'new Date()' so eval works
  let data;
  try {
    data = eval(`(${arrayStr})`);
  } catch (e) {
    console.error("Error evaluating array for", tableName, e);
    // fallback if eval fails due to syntax
    const cleaned = arrayStr.replace(/new Date\(\)/g, '"2026-06-19T00:00:00Z"');
    data = eval(`(${cleaned})`);
  }
  return data;
}

const categories = extractBulkInsert(path.join(__dirname, '../src/seeders/temp-main-categories.js'), 'categories');
const products = extractBulkInsert(path.join(__dirname, '../src/seeders/temp-main-products.js'), 'products');
const productImages = extractBulkInsert(path.join(__dirname, '../src/seeders/temp-main-products.js'), 'product_images');
const productVariants = extractBulkInsert(path.join(__dirname, '../src/seeders/temp-main-products.js'), 'product_variants');

console.log(`Extracted: ${categories.length} categories, ${products.length} products, ${productImages.length} images, ${productVariants.length} variants`);

categories.forEach(c => { delete c.created_at; delete c.updated_at; }); productImages.forEach(i => { delete i.created_at; delete i.updated_at; }); productVariants.forEach(v => { delete v.created_at; delete v.updated_at; });
// Transform products
const mappedProducts = products.map(p => {
  // brand_id 1 (Nike) -> shop_id 1
  // brand_id 3 (Uniqlo) -> shop_id 2
  // Others to shop_id 1
  const shop_id = p.brand_id === 3 ? 2 : 1;
  return {
    id: p.id,
    shop_id: shop_id,
    category_id: p.category_id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    sale_price: p.sale_price,
    sold_count: p.sold_count,
    view_count: p.view_count,
    is_new: p.is_new,
    is_featured: p.is_featured,
    gender: p.gender,
    material: p.material,
    approval_status: p.status === 'ACTIVE' ? 'APPROVED' : 'PENDING',
    created_at: p.created_at,
    updated_at: p.updated_at
  };
});

// Create the new seeder content
const seederContent = `
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // 1. Clear existing products and categories first
    await queryInterface.bulkDelete('product_variants', null, {});
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});

    // 2. Insert Categories
    await queryInterface.bulkInsert('categories', ${JSON.stringify(categories, null, 2).replace(/"2026-06-19T00:00:00Z"/g, 'new Date()')}, { ignoreDuplicates: true });

    // 3. Insert Products
    await queryInterface.bulkInsert('products', ${JSON.stringify(mappedProducts, null, 2).replace(/"2026-06-19T00:00:00Z"/g, 'new Date()')}, { ignoreDuplicates: true });

    // 4. Insert Images
    await queryInterface.bulkInsert('product_images', ${JSON.stringify(productImages, null, 2).replace(/"2026-06-19T00:00:00Z"/g, 'new Date()')}, { ignoreDuplicates: true });

    // 5. Insert Variants
    await queryInterface.bulkInsert('product_variants', ${JSON.stringify(productVariants, null, 2).replace(/"2026-06-19T00:00:00Z"/g, 'new Date()')}, { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('product_variants', null, {});
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
  }
};
`;

fs.writeFileSync(path.join(__dirname, '../src/seeders/04-migrate-main-data.js'), seederContent);
console.log("Created 04-migrate-main-data.js successfully.");
