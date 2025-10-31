#!/usr/bin/env node

/**
 * Auto-fix script to replace img tags with OptimizedImage
 * Usage: node scripts/auto-fix-images.js
 * 
 * WARNING: This script modifies files. Commit your changes before running!
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
let filesModified = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file already imports OptimizedImage
  const hasOptimizedImageImport = content.includes('OptimizedImage');
  
  // Check if file has img tags
  const hasImgTags = /<img\s/i.test(content);

  if (hasImgTags && !hasOptimizedImageImport) {
    // Add import at the top (after other imports)
    const importStatement = "import OptimizedImage from '@/components/common/OptimizedImage';\n";
    
    // Find the last import statement
    const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
      modified = true;
    }
  }

  if (hasImgTags) {
    // Simple replacements (this is a basic implementation)
    // For complex cases, manual review is still recommended
    
    // Replace <img with <OptimizedImage
    content = content.replace(/<img\s/g, '<OptimizedImage ');
    
    // Replace closing /> or >
    content = content.replace(/(<OptimizedImage[^>]*?)>/g, '$1/>');
    
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    filesModified++;
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.match(/\.(jsx?|tsx?)$/)) {
      if (fixFile(filePath)) {
        console.log(`✅ Fixed: ${filePath.replace(srcDir, 'src')}`);
      }
    }
  });
}

console.log('🔧 Auto-fixing image tags...\n');
console.log('⚠️  WARNING: This will modify files. Make sure you have committed your changes!\n');

// Give user 3 seconds to cancel
setTimeout(() => {
  processDirectory(srcDir);
  
  console.log(`\n✅ Complete! Modified ${filesModified} files.`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes with git diff');
  console.log('2. Manually add width and height props to images');
  console.log('3. Test the application');
  console.log('4. Run npm run lint to check for issues');
}, 3000);

console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
