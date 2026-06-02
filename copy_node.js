const fs = require('fs');
const src = '/Volumes/BriteBrain/IDE/nvm/versions/node/v20.19.5/bin/node';
const dest = './node';

console.log('Copying from', src, 'to', dest);
try {
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
  console.log('Successfully copied and set executable permissions!');
} catch (err) {
  console.error('Error during copy:', err.message);
}
