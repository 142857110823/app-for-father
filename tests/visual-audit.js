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
const outputDir = path.join(root, 'artifacts', 'visual-audit');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.QIMEN_VISUAL_URL || 'http://localhost:8090/?qa=visual-audit';

async function auditViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.selectOption('#y', '2026');
  await page.selectOption('#m', '8');
  await page.selectOption('#d', '14');
  await page.selectOption('#h', '12');
  await page.selectOption('#min', '22');
  await page.getByText('开始排盘', { exact: true }).click();
  await page.locator('#plate-table td.center').waitFor();
  await page.waitForTimeout(2200);

  const result = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#plate-table td:not(.empty)')];
    const overlaps = [];
    const overflow = [];

    for (const cell of cells) {
      if (cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1) {
        overflow.push({
          text: cell.innerText,
          scrollWidth: cell.scrollWidth,
          clientWidth: cell.clientWidth,
          scrollHeight: cell.scrollHeight,
          clientHeight: cell.clientHeight,
        });
      }

      const items = [...cell.querySelectorAll(
        '.pc-shen,.pc-xing,.pc-men,.pc-ling,.pc-tian,.pc-di,.pc-ren,.pc-tg,.pc-rp',
      )].filter((item) => item.textContent.trim());

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].getBoundingClientRect();
          const b = items[j].getBoundingClientRect();
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            overlaps.push([items[i].textContent, items[j].textContent]);
          }
        }
      }
    }

    const center = document.querySelector('#plate-table td.center');
    return {
      centerText: center.innerText.split(/\s+/).filter(Boolean),
      centerColspan: center.getAttribute('colspan'),
      centerRowspan: center.getAttribute('rowspan'),
      dates: [...document.querySelectorAll('.pc-rp')].map((item) => item.textContent),
      tiangang: [...document.querySelectorAll('.pc-tg')].map((item) => ({
        text: item.textContent,
        writingMode: getComputedStyle(item).writingMode,
      })),
      overlaps,
      overflow,
    };
  });

  await page.screenshot({
    path: path.join(outputDir, `page-${width}x${height}.png`),
    fullPage: true,
  });
  await page.locator('#ai-fab').evaluate((element) => {
    element.style.visibility = 'hidden';
  });
  await page.locator('.bottom-nav').evaluate((element) => {
    element.style.visibility = 'hidden';
  });
  await page.locator('#plate-table').screenshot({
    path: path.join(outputDir, `plate-${width}x${height}.png`),
  });
  await page.close();
  return result;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  try {
    const results = {};
    for (const [width, height] of [[480, 900], [360, 800]]) {
      results[`${width}x${height}`] = await auditViewport(browser, width, height);
    }

    fs.writeFileSync(
      path.join(outputDir, 'visual-audit.json'),
      JSON.stringify({ url, checkedAt: new Date().toISOString(), results }, null, 2),
    );

    for (const [viewport, result] of Object.entries(results)) {
      if (result.centerText.join('/') !== '太常/贪狼/休/癸/乙/乙/戊') {
        throw new Error(`${viewport} 中宫内容不符合标准: ${result.centerText.join('/')}`);
      }
      if (result.centerColspan !== '2' || result.centerRowspan !== '2') {
        throw new Error(`${viewport} 中宫未保持 2x2 合并`);
      }
      if (!result.dates.includes('1/2/3/29/30/31')) {
        throw new Error(`${viewport} 缺少完整日排局日期簇`);
      }
      if (result.tiangang.some((item) => item.writingMode !== 'vertical-rl')) {
        throw new Error(`${viewport} 存在未纵排的天罡标签`);
      }
      if (result.overlaps.length || result.overflow.length) {
        throw new Error(
          `${viewport} 视觉异常: overlaps=${JSON.stringify(result.overlaps)} overflow=${JSON.stringify(result.overflow)}`,
        );
      }
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
