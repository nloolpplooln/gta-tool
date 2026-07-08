/* Post-build cleanup: remove unused locales + license to shrink package */
const fs = require('fs');
const path = require('path');

const unpacked = path.join(__dirname, '..', 'dist', 'win-unpacked');
if (!fs.existsSync(unpacked)) { console.log('No win-unpacked found, skipping'); process.exit(0); }

// Remove unused locale files (keep zh-CN + zh-TW + en-US)
const localesDir = path.join(unpacked, 'locales');
if (fs.existsSync(localesDir)) {
  const keep = ['zh-CN', 'zh-TW', 'en-US'];
  let count = 0;
  fs.readdirSync(localesDir).forEach(function (file) {
    const name = path.basename(file, '.pak');
    if (!keep.includes(name)) {
      fs.unlinkSync(path.join(localesDir, file));
      count++;
    }
  });
  console.log('Removed ' + count + ' unused locale files');
}

// Remove large license file
const licenseFile = path.join(unpacked, 'LICENSES.chromium.html');
if (fs.existsSync(licenseFile)) {
  fs.unlinkSync(licenseFile);
  console.log('Removed LICENSES.chromium.html');
}

// Remove electron license file too
const eleLicense = path.join(unpacked, 'LICENSE.electron.txt');
if (fs.existsSync(eleLicense)) {
  fs.unlinkSync(eleLicense);
}

console.log('Build cleanup complete');
