// fix-deps.js
// This script modifies the package.json directly to fix dependency conflicts
const fs = require('fs');

console.log('Fixing dependency conflicts for Vercel deployment...');

// Read the current package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (err) {
  console.error('Error reading package.json:', err);
  process.exit(1);
}

// Add overrides to force the correct version
packageJson.overrides = {
  "@aptos-labs/derived-wallet-ethereum": {
    "@aptos-labs/ts-sdk": "^2.0.1"
  }
};

// Add resolutions for Yarn
packageJson.resolutions = {
  "@aptos-labs/ts-sdk": "2.0.1"
};

// Update the specific versions to ones that work together
if (packageJson.dependencies) {  packageJson.dependencies["@aptos-labs/wallet-adapter-react"] = "^6.1.2";
  packageJson.dependencies["@aptos-labs/wallet-standard"] = "^0.5.0";
  packageJson.dependencies["@aptos-labs/ts-sdk"] = "^2.0.1";
}

// Write the updated package.json
try {
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('Successfully updated package.json');
} catch (err) {
  console.error('Error writing package.json:', err);
  process.exit(1);
}

// Create an .npmrc file with legacy-peer-deps enabled
try {
  fs.writeFileSync('.npmrc', 'legacy-peer-deps=true\n');
  console.log('Created .npmrc with legacy-peer-deps enabled');
} catch (err) {
  console.error('Error creating .npmrc:', err);
}

console.log('Dependency fix complete!');
