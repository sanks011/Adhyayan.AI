// pre-vercel-deploy.js
const fs = require('fs');
const path = require('path');

// Path to the original and Vercel optimized package.json files
const originalPackageJsonPath = path.join(__dirname, 'package.json');
const vercelPackageJsonPath = path.join(__dirname, 'package.json.vercel');
const backupPackageJsonPath = path.join(__dirname, 'package.json.backup');

console.log('Preparing package.json for Vercel deployment...');

// Backup the original package.json
if (fs.existsSync(originalPackageJsonPath)) {
  console.log('Backing up original package.json...');
  fs.copyFileSync(originalPackageJsonPath, backupPackageJsonPath);
}

// Copy the Vercel-optimized package.json
if (fs.existsSync(vercelPackageJsonPath)) {
  console.log('Applying Vercel-optimized package.json...');
  fs.copyFileSync(vercelPackageJsonPath, originalPackageJsonPath);
  console.log('Done! Ready for Vercel deployment.');
} else {
  console.error('Error: Vercel-optimized package.json not found!');
  process.exit(1);
}
