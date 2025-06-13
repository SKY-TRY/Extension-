
// Simple build script for Chrome Extension
const fs = require('fs');
const path = require('path');

// Copy icons from public assets if they exist
function copyIcons() {
  const assetsDir = path.join(__dirname, '../public/assets');
  const iconsDir = path.join(__dirname, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // Copy and rename logo files to standard icon sizes
  const logoFile = path.join(assetsDir, 'logo-dark-theme.png');
  
  if (fs.existsSync(logoFile)) {
    // For now, just copy the same file to all sizes
    // In production, you'd want to resize these properly
    const iconSizes = ['16', '32', '48', '128'];
    
    iconSizes.forEach(size => {
      const targetFile = path.join(iconsDir, `icon-${size}.png`);
      if (!fs.existsSync(targetFile)) {
        fs.copyFileSync(logoFile, targetFile);
        console.log(`Created icon-${size}.png`);
      }
    });
  } else {
    console.log('Logo file not found. Please add icon files manually to /extension/icons/');
  }
}

console.log('Building Chrome Extension...');
copyIcons();
console.log('Extension build complete! Ready to zip and upload to Chrome Web Store.');
