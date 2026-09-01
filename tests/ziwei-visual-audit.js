/**
 * 紫微命盘（ZiWeiPro）视觉审查脚本
 * 运行：node tests/ziwei-visual-audit.js（需先启动本地静态服务器：端口 8090）
 * 产物：artifacts/visual-audit/zw-page-{w}x{h}.png、zw-board-{w}x{h}.png、zw-visual-audit.json
 * 审查项：三案例 × 三视口（1280×900 / 480×900 / 360×800）——宫位溢出、元素重叠、中宫 2×2 结构、身宫/四化标记
 */
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
const url = process.env.ZIWEI_VISUAL_URL || 'http://localhost:8090/artifacts/visual-audit/zw-preview.html';

async function auditViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#c3 .zw-table').waitFor();
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const boards = [...document.querySelectorAll('.zw-table')];
    const data = { boardCount: boards.length, boards: [] };
    boards.forEach((board) => {
      const cells = [...board.querySelectorAll('td')];
      const overlaps = [];
      const overflow = [];
      for (const cell of cells) {
        if (cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1) {
          overflow.push({
            text: cell.innerText.replace(/\s+/g, ' ').slice(0, 40),
            scrollW: cell.scrollWidth, clientW: cell.clientWidth,
            scrollH: cell.scrollHeight, clientH: cell.clientHeight,
          });
        }
        // 宫内可见元素两两重叠检测（容差 1px）
        const items = [...cell.querySelectorAll(
          '.zw-name,.zw-body-tag,.zw-major,.zw-minor,.zw-adjective,.zw-decadal,.zw-age',
        )].filter((el) => el.textContent.trim());
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i].getBoundingClientRect();
            const b = items[j].getBoundingClientRect();
            if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
              overlaps.push([items[i].textContent.trim().slice(0, 14), items[j].textContent.trim().slice(0, 14)]);
            }
          }
        }
      }
      const center = board.querySelector('td.zw-center');
      data.boards.push({
        cellCount: cells.length,
        centerColspan: center ? center.getAttribute('colspan') : null,
        centerRowspan: center ? center.getAttribute('rowspan') : null,
        soulCells: board.querySelectorAll('.zw-cell--soul').length,
        bodyTags: board.querySelectorAll('.zw-body-tag').length,
        mutSup: board.querySelectorAll('.zw-mut').length,
        starRed: board.querySelectorAll('.zw-star').length,
        overlaps,
        overflow,
      });
    });
    data.statusText = document.getElementById('status') ? document.getElementById('status').textContent : '';
    return data;
  });

  await page.screenshot({ path: path.join(outputDir, `zw-page-${width}x${height}.png`), fullPage: true });
  await page.locator('#c1 .zw-table').screenshot({ path: path.join(outputDir, `zw-board-${width}x${height}.png`) });
  await page.close();
  return result;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  try {
    const results = {};
    for (const [width, height] of [[1280, 900], [480, 900], [360, 800]]) {
      results[`${width}x${height}`] = await auditViewport(browser, width, height);
    }
    fs.writeFileSync(
      path.join(outputDir, 'zw-visual-audit.json'),
      JSON.stringify({ url, checkedAt: new Date().toISOString(), results }, null, 2),
    );

    let ok = true;
    const summary = {};
    for (const [vp, r] of Object.entries(results)) {
      const overlaps = r.boards.reduce((s, b) => s + b.overlaps.length, 0);
      const overflow = r.boards.reduce((s, b) => s + b.overflow.length, 0);
      const structureOk = r.boards.every(
        (b) => b.cellCount === 13 && b.centerColspan === '2' && b.centerRowspan === '2'
          && b.soulCells === 1 && b.bodyTags === 1 && b.mutSup === 4,
      );
      summary[vp] = { overlaps, overflow, structureOk, boardCount: r.boardCount };
      if (overlaps || overflow || !structureOk) ok = false;
      if (overlaps) {
        summary[vp].overlapDetail = r.boards.flatMap((b) => b.overlaps);
      }
      if (overflow) {
        summary[vp].overflowDetail = r.boards.flatMap((b) => b.overflow);
      }
    }
    summary.statusText = results['1280x900'].statusText;
    console.log(JSON.stringify(summary, null, 2));
    console.log(ok ? 'VISUAL AUDIT PASS' : 'VISUAL AUDIT FAIL');
    process.exitCode = ok ? 0 : 1;
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });