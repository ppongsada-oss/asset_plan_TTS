import urllib.request
import json
import tarfile
import os
import shutil

try:
    # Get latest vercel version
    url = "https://registry.npmjs.org/vercel/latest"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        tarball_url = data['dist']['tarball']
        version = data['version']

    print(f"Downloading Vercel v{version} from {tarball_url}...")

    # Download tarball
    tarball_path = "vercel.tgz"
    urllib.request.urlretrieve(tarball_url, tarball_path)

    # Extract
    print("Extracting Vercel...")
    target_dir = "node_modules/vercel"
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)

    if os.path.exists("temp_vercel"):
        shutil.rmtree("temp_vercel")

    with tarfile.open(tarball_path, "r:gz") as tar:
        tar.extractall(path="temp_vercel")

    # NPM packages are nested under 'package' inside the tarball
    shutil.move("temp_vercel/package", target_dir)
    shutil.rmtree("temp_vercel")
    os.remove(tarball_path)

    # Create binary wrapper in node_modules/.bin/vercel
    bin_dir = "node_modules/.bin"
    os.makedirs(bin_dir, exist_ok=True)
    bin_path = os.path.join(bin_dir, "vercel")
    if os.path.exists(bin_path):
        os.remove(bin_path)

    # Vercel entrypoint is dist/index.js
    with open(bin_path, "w") as f:
        f.write("#!/usr/bin/env node\n")
        f.write("require('../vercel/dist/index.js');\n")

    os.chmod(bin_path, 0o755)
    print("Vercel installed successfully in node_modules/vercel!")
except Exception as e:
    print(f"Error: {e}")
