import os
import subprocess
import shutil

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
USER_DATA_DIR = "/Volumes/BriteBrain/Projects/Asset Plan/.chrome_user_data"
CRASH_DUMPS_DIR = "/Volumes/BriteBrain/Projects/Asset Plan/.chrome_crash"
IMG_DIR = "/Volumes/BriteBrain/Projects/Asset Plan/public/manual-images"

# Recreate directories
if os.path.exists(USER_DATA_DIR):
    try:
        shutil.rmtree(USER_DATA_DIR)
    except Exception:
        pass
os.makedirs(USER_DATA_DIR, exist_ok=True)
os.makedirs(CRASH_DUMPS_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

out_img = os.path.join(IMG_DIR, "login-page.png")
url = "http://127.0.0.1:3000/login"

cmd = [
    CHROME_BIN,
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    f"--user-data-dir={USER_DATA_DIR}",
    f"--crash-dumps-dir={CRASH_DUMPS_DIR}",
    "--window-size=1280,800",
    f"--screenshot={out_img}",
    url
]

print("Running test Chrome screenshot command and printing stdout/stderr...")
env = os.environ.copy()
env["TMPDIR"] = "/Volumes/BriteBrain/Projects/Asset Plan"

try:
    res = subprocess.run(cmd, env=env, timeout=15, capture_output=True, text=True)
    print("STDOUT:")
    print(res.stdout)
    print("STDERR:")
    print(res.stderr)
except subprocess.TimeoutExpired as e:
    print("Command timed out!")
    print("STDOUT SO FAR:")
    print(e.stdout)
    print("STDERR SO FAR:")
    print(e.stderr)
except Exception as e:
    print("Error executing Chrome:", e)
