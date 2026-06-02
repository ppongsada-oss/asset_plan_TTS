const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return getJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}. Data: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  try {
    console.log("Fetching Vercel latest metadata...");
    const metadata = await getJson('https://registry.npmjs.org/vercel/latest');
    const tarballUrl = metadata.dist.tarball;
    const version = metadata.version;

    console.log(`Downloading Vercel v${version} from ${tarballUrl}...`);
    const tarballPath = path.join(__dirname, 'vercel.tgz');
    await downloadFile(tarballUrl, tarballPath);

    console.log("Extracting Vercel...");
    const targetDir = path.join(__dirname, 'node_modules', 'vercel');
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    const tempExtractDir = path.join(__dirname, 'temp_vercel');
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });

    // Extract using tar command (tar is a system binary, hopefully allowed)
    execSync(`tar -xzf "${tarballPath}" -C "${tempExtractDir}"`);

    // Move package contents
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.renameSync(path.join(tempExtractDir, 'package'), targetDir);

    // Cleanup
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.rmSync(tarballPath, { force: true });

    // Create binary wrapper in node_modules/.bin/vercel
    const binDir = path.join(__dirname, 'node_modules', '.bin');
    fs.mkdirSync(binDir, { recursive: true });
    const binPath = path.join(binDir, 'vercel');
    if (fs.existsSync(binPath)) {
      fs.rmSync(binPath, { force: true });
    }

    fs.writeFileSync(binPath, "#!/usr/bin/env node\nrequire('../vercel/dist/index.js');\n");
    fs.chmodSync(binPath, 0o755);

    console.log("Vercel installed successfully in node_modules/vercel!");
  } catch (error) {
    console.error("Installation failed:", error.stack || error.message);
  }
}

main();
