#!/usr/bin/env node
/**
 * Import Sortly Excel Backup into Gloss Inventory
 * 
 * Usage: node import-sortly.js [path-to-xlsx]
 */

const fs = require('fs');
const path = require('path');

// Check if xlsx library is available
try {
  require.resolve('xlsx');
} catch (e) {
  console.error('❌ xlsx package not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install xlsx --save-dev', { cwd: path.dirname(__dirname), stdio: 'inherit' });
}

const XLSX = require('xlsx');

const DEFAULT_FILE = path.join(__dirname, '..', 'sortlybackup.xlsx');
const filePath = process.argv[2] || DEFAULT_FILE;

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  console.log('Usage: node import-sortly.js [path-to-xlsx]');
  process.exit(1);
}

console.log(`📁 Reading: ${filePath}`);

// Read the Excel file
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Found ${data.length} rows in sheet "${sheetName}"`);

// Display column headers
if (data.length > 0) {
  const firstRow = data[0];
  console.log('\n📋 Columns found:');
  Object.keys(firstRow).forEach((key, i) => {
    console.log(`  ${i + 1}. ${key}`);
  });
  
  console.log('\n📄 First row sample:');
  console.log(JSON.stringify(firstRow, null, 2));
}

// Generate SQL and JSON for import
const organizationId = 'demo-gloss-heights';
const now = new Date().toISOString();

const products = data.map((row, index) => {
  const localId = `sortly-${Date.now()}-${index}`;
  
  // Map Sortly columns to Gloss Inventory schema
  // Adjust these based on your actual column names
  return {
    local_id: localId,
    id: null,
    organization_id: organizationId,
    name: row['Name'] || row['name'] || row['Item Name'] || `Item ${index + 1}`,
    description: row['Description'] || row['description'] || null,
    sku: row['SKU'] || row['sku'] || null,
    barcode: row['Barcode'] || row['barcode'] || null,
    unit_of_measure: row['Unit'] || row['unit'] || 'piece',
    cost_method: 'fifo',
    reorder_point: parseInt(row['Reorder Point'] || row['Reorder'] || '0') || 0,
    preferred_vendor_id: null,
    category_id: null, // Will need to map categories
    is_active: true,
    created_at: now,
    updated_at: now,
    sync_status: 'pending',
    qbo_item_id: null,
    // Inventory level from Sortly
    quantity: parseFloat(row['Quantity'] || row['Qty'] || row['Current Stock'] || '0') || 0,
    location: row['Location'] || row['location'] || 'Unassigned',
  };
});

console.log(`\n✅ Parsed ${products.length} products`);

// Save to JSON for review
const outputPath = path.join(__dirname, '..', 'sortly-import.json');
fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
console.log(`\n💾 Saved parsed data to: ${outputPath}`);

// Generate SQL insert statements
const sqlPath = path.join(__dirname, '..', 'sortly-import.sql');
let sql = `-- Sortly Import SQL\n-- Generated: ${now}\n\n`;

// Create categories first
const categories = [...new Set(products.map(p => p.location).filter(Boolean))];
sql += `-- Categories\n`;
categories.forEach(cat => {
  const catId = `cat-${Buffer.from(cat).toString('base64').slice(0, 8)}`;
  sql += `INSERT INTO categories (id, organization_id, name, created_at, updated_at) VALUES ('${catId}', '${organizationId}', '${cat.replace(/'/g, "''")}', '${now}', '${now}') ON CONFLICT DO NOTHING;\n`;
});

sql += `\n-- Products\n`;
products.forEach(p => {
  const fields = Object.keys(p).filter(k => k !== 'quantity' && k !== 'location');
  const values = fields.map(f => {
    const val = p[f];
    if (val === null) return 'NULL';
    if (typeof val === 'boolean') return val;
    return `'${String(val).replace(/'/g, "''")}'`;
  });
  
  sql += `INSERT INTO products (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
});

fs.writeFileSync(sqlPath, sql);
console.log(`💾 Saved SQL to: ${sqlPath}`);

console.log('\n📦 Import Summary:');
console.log(`  - Products: ${products.length}`);
console.log(`  - Locations/Categories: ${categories.length}`);
console.log(`\n⚠️  Review the JSON file before importing!`);
console.log('\nTo import into IndexedDB:');
console.log('  1. Open the Gloss Inventory app');
console.log('  2. Use the browser console to import:');
console.log('     const data = await fetch(\'/sortly-import.json\').then(r => r.json());');
console.log('     // Then use the IndexedDB API to insert');
