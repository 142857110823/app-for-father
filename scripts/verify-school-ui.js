const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'school-ui-verification.json');
const mobileShot = path.join(root, 'school-mobile.png');
const readerShot = path.join(root, 'school-reader.png');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.setOffline(true);
    const page = await context.newPage();
    const errors = [];
    const missingResources = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() === 404) missingResources.push(response.url());
    });

    await context.setOffline(false);
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.evaluate(() => showPage('school'));
    await page.waitForSelector('.school-book[data-book-id]');
    const cardCount = await page.locator('.school-book[data-book-id]').count();
    const titles = await page.locator('.school-book-title').allTextContents();
    const summary = await page.locator('#school-library-summary').textContent();
    await page.screenshot({ path: mobileShot, fullPage: true });

    await context.setOffline(false);
    await page.locator('[data-book-id="yanbo-diaosou"] [data-action="download"]').click();
    await page.waitForFunction(() => (
      document.querySelector('[data-book-id="yanbo-diaosou"] [data-action="read"]')
    ), null, { timeout: 30000 });
    await page.locator('[data-book-id="yanbo-diaosou"] [data-action="read"]').click();
    await page.waitForSelector('.school-reader-shell');
    await page.waitForTimeout(1200);
    const readerTitle = await page.locator('.sr-book-title').textContent();
    const iframeCount = await page.locator('.school-reader-stage iframe').count();
    await page.screenshot({ path: readerShot, fullPage: true });

    const result = {
      cardCount,
      titles,
      summary,
      readerTitle,
      iframeCount,
      errors,
      missingResources,
      mobileShot,
      readerShot,
    };
    fs.writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
    console.log(JSON.stringify(result, null, 2));
    const relevantErrors = errors.filter((error) => !(
      error.includes('Failed to load resource')
      && missingResources.every((url) => url.endsWith('/favicon.ico'))
    ));
    if (cardCount !== 8 || iframeCount < 1 || relevantErrors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
