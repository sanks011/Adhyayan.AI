// post-vercel-deploy.js
const fs = require('fs');
const path = require('path');

// Path to the backup package.json
const originalPackageJsonPath = path.join(__dirname, 'package.json');
const backupPackageJsonPath = path.join(__dirname, 'package.json.backup');

console.log('Restoring original package.json after Vercel deployment...');

// Restore the original package.json
if (fs.existsSync(backupPackageJsonPath)) {
  console.log('Restoring from backup...');
  fs.copyFileSync(backupPackageJsonPath, originalPackageJsonPath);
  console.log('Original package.json restored.');
  
  // Optionally remove the backup
  fs.unlinkSync(backupPackageJsonPath);
  console.log('Backup file removed.');
} else {
  console.error('Error: Backup package.json not found!');
}
