#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find and fix JS files
function fixImportsInDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImportsInDirectory(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Fix @shared imports
      const newContent = content.replace(
        /require\("@shared\/([^"]+)"\)/g,
        (match, importPath) => {
          modified = true;
          return `require("../../shared/${importPath}")`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  }
}

// Function to copy SQL migration files
function copySqlMigrations() {
  const srcMigrationsDir = path.join(__dirname, '..', 'src', 'main', 'database', 'migrations');
  const distMigrationsDir = path.join(__dirname, '..', 'dist', 'main', 'main', 'database', 'migrations');
  
  if (!fs.existsSync(srcMigrationsDir)) {
    console.log('Source migrations directory not found');
    return;
  }
  
  // Ensure destination directory exists
  if (!fs.existsSync(distMigrationsDir)) {
    fs.mkdirSync(distMigrationsDir, { recursive: true });
  }
  
  const files = fs.readdirSync(srcMigrationsDir);
  let copiedCount = 0;
  
  for (const file of files) {
    if (file.endsWith('.sql')) {
      const srcPath = path.join(srcMigrationsDir, file);
      const destPath = path.join(distMigrationsDir, file);
      
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied migration file: ${file}`);
      copiedCount++;
    }
  }
  
  console.log(`Copied ${copiedCount} SQL migration files`);
}

// Fix imports in the main dist directory
const distMainDir = path.join(__dirname, '..', 'dist', 'main', 'main');
if (fs.existsSync(distMainDir)) {
  console.log('Fixing @shared imports...');
  fixImportsInDirectory(distMainDir);
  console.log('Import fixing complete!');
  
  console.log('Copying SQL migration files...');
  copySqlMigrations();
  console.log('Migration file copying complete!');
} else {
  console.log('dist/main/main directory not found');
}