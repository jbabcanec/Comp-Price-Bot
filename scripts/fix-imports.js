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

// Fix imports in the main dist directory
const distMainDir = path.join(__dirname, '..', 'dist', 'main', 'main');
if (fs.existsSync(distMainDir)) {
  console.log('Fixing @shared imports...');
  fixImportsInDirectory(distMainDir);
  console.log('Import fixing complete!');
} else {
  console.log('dist/main/main directory not found');
}