const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:3000';
const IMG_DIR = path.join(__dirname, '../public/manual-images');

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // run headfully so we can see it and page loads correctly
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  try {
    // 1. Login Page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(IMG_DIR, 'login-page.png') });

    // Fill credentials
    console.log('Logging in...');
    await page.type('input[type="email"]', 'p.pongsada@gmail.com');
    await page.type('input[type="password"]', '9991IssB343');
    await page.screenshot({ path: path.join(IMG_DIR, 'login-filled.png') });
    
    // Submit
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    console.log('Logged in successfully!');
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'dashboard-home.png') });

    // 2. Admin Users
    console.log('Navigating to Admin Users...');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'admin-users-list.png') });

    // 3. Admin Projects
    console.log('Navigating to Admin Projects...');
    await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'admin-projects-list.png') });

    // 4. Admin Project Roles
    console.log('Navigating to Admin Project Roles...');
    await page.goto(`${BASE_URL}/admin/project-roles`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'admin-project-roles.png') });

    // 5. Master Data
    console.log('Navigating to Master Data...');
    await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'master-data-list.png') });

    // 6. Store Center Dashboard
    console.log('Navigating to Store Center...');
    await page.goto(`${BASE_URL}/store-center`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'store-center-dashboard.png') });

    // 7. Site Plan List
    console.log('Navigating to Site Plan Dashboard...');
    await page.goto(`${BASE_URL}/site-plan`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'site-plan-dashboard.png') });

    // 8. PM Approval Hub
    console.log('Navigating to PM Approval Hub...');
    await page.goto(`${BASE_URL}/site-plan/pm-approval`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'pm-approval-dashboard.png') });

    // 9. Matrix Report
    console.log('Navigating to Matrix Report...');
    await page.goto(`${BASE_URL}/matrix-report`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await page.screenshot({ path: path.join(IMG_DIR, 'matrix-report-pivot.png') });

    console.log('All core page screenshots captured successfully!');
  } catch (err) {
    console.error('Automation error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
