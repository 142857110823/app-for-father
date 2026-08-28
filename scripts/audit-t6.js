const fs = require('node:fs');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  const bundledPlaywright = path.join(
    process.env.USERPROFILE || '',
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules',
    'playwright',
  );
  ({ chromium } = require(bundledPlaywright));
}

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.QIMEN_VISUAL_URL || 'http://localhost:8090/';

async function openResult(page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.selectOption('#y', '2026');
  await page.selectOption('#m', '8');
  await page.selectOption('#d', '14');
  await page.selectOption('#h', '12');
  await page.selectOption('#min', '22');
  await page.getByText('开始排盘', { exact: true }).click();
  await page.locator('#plate-table td.center').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
}

async function screenshotPlate(page, namePrefix) {
  await page.locator('#ai-fab').evaluate((el) => { el.style.visibility = 'hidden'; });
  await page.locator('.bottom-nav').evaluate((el) => { el.style.visibility = 'hidden'; });
  await page.screenshot({ path: path.join(outDir, `${namePrefix}-page.png`), fullPage: true });
  await page.locator('#plate-table').screenshot({ path: path.join(outDir, `${namePrefix}-plate.png`) });
  await page.locator('#ai-fab').evaluate((el) => { el.style.visibility = ''; });
  await page.locator('.bottom-nav').evaluate((el) => { el.style.visibility = ''; });
}

async function auditViewport(browser, width, height, prefix) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await openResult(page);
  await screenshotPlate(page, prefix);

  const preCheck = await page.evaluate(() => ({
    hasShowShengWang: typeof showShengWang,
    hasCurData: typeof curData !== 'undefined' && !!curData,
    curPalaces: (typeof curData !== 'undefined' && curData && curData.palaces) ? curData.palaces.length : 0,
  }));
  console.log('preCheck:', preCheck);

  const ganCheck = await page.evaluate(() => {
    if (typeof showShengWang !== 'function' || typeof curData === 'undefined' || !curData) {
      return { error: 'function or data missing', hasFn: typeof showShengWang, hasData: typeof curData !== 'undefined' && !!curData };
    }
    showShengWang('tian', 5);
    const modal = document.getElementById('palace-modal');
    return {
      hasShow: modal.classList.contains('show'),
      title: document.getElementById('modal-title').textContent,
      sub: document.getElementById('modal-sub').textContent,
      html: document.getElementById('modal-content').innerHTML,
    };
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${prefix}-modal-gan.png`) });

  console.log('ganCheck:', ganCheck);
  if (!ganCheck.html) {
    await page.screenshot({ path: path.join(outDir, `${prefix}-modal-error.png`) });
    throw new Error(`${prefix} 干字弹窗验证失败: ${JSON.stringify(ganCheck)}`);
  }
  const hasStateCard = ganCheck.html.includes('sw-state-card');
  const hasSwTable = ganCheck.html.includes('sw-tbl');
  const hasAnno = ganCheck.html.includes('丙奇入墓');

  await page.evaluate(() => {
    document.getElementById('palace-modal').classList.remove('show');
    if (typeof showPalaceDetail === 'function') showPalaceDetail(5);
  });
  await page.waitForTimeout(400);
  const palaceCheck = await page.evaluate(() => ({
    title: document.getElementById('modal-title').textContent,
    html: document.getElementById('modal-content').innerHTML,
  }));
  await page.screenshot({ path: path.join(outDir, `${prefix}-modal-palace.png`) });
  await page.close();

  return {
    ganModal: {
      title: ganCheck.title,
      sub: ganCheck.sub,
      hasStateCard,
      hasSwTable,
      hasAnno,
    },
    palaceModal: {
      title: palaceCheck.title,
      hasFourGan: palaceCheck.html.includes('本宫四干'),
      hasWholeTable: palaceCheck.html.includes('sw-tbl'),
      hasAnno: palaceCheck.html.includes('丙奇入墓'),
    },
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  try {
    const mobile = await auditViewport(browser, 375, 812, 't6-mobile-375-20260828');
    const desktop = await auditViewport(browser, 1280, 720, 't6-desktop-1280-20260828');
    const report = {
      url,
      checkedAt: new Date().toISOString(),
      mobile,
      desktop,
    };
    fs.writeFileSync(path.join(outDir, 't6-audit-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
