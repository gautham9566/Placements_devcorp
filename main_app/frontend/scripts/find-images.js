#!/usr/bin/env node

/**
 * Script to find and report all img tags that need to be replaced with OptimizedImage
 * Usage: node scripts/find-images.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const results = [];

function searchFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      searchFiles(filePath);
    } else if (file.match(/\.(jsx?|tsx?)$/)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('<img') || line.match(/import.*Image.*from.*['"]next\/image['"]/)) {
          results.push({
            file: filePath.replace(srcDir, 'src'),
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }
  });
}

console.log('🔍 Searching for image usage in src directory...\n');
searchFiles(srcDir);

if (results.length === 0) {
  console.log('✅ No img tags or Next Image imports found!');
} else {
  console.log(`📊 Found ${results.length} image-related lines:\n`);
  
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.file]) {
      acc[item.file] = [];
    }
    acc[item.file].push(item);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([file, items]) => {
    console.log(`\n📄 ${file}`);
    items.forEach(item => {
      console.log(`   Line ${item.line}: ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}`);
    });
  });

  console.log('\n\n💡 To optimize images:');
  console.log('1. Import OptimizedImage: import OptimizedImage from "@/components/common/OptimizedImage"');
  console.log('2. Replace <img> with <OptimizedImage>');
  console.log('3. Add width and height props');
  console.log('4. Remove img-specific HTML attributes');
}

console.log('\n✅ Analysis complete!');
