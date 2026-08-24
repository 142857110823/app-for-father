const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SCHOOL_CATALOG, isValidEpub } = require('../school-library.js');

const root = path.resolve(__dirname, '..');
const booksDir = path.join(root, 'docs', 'books');
const dataDir = path.join(root, 'data');
const exportBase = 'https://ws-export.wmcloud.org/';

function exportUrl(title) {
  const params = new URLSearchParams({
    lang: 'zh',
    title,
    format: 'epub',
    page: title,
  });
  return `${exportBase}?${params}`;
}

async function downloadBook(book) {
  const url = exportUrl(book.exportTitle);
  const response = await fetch(url, {
    headers: { 'user-agent': 'QimenSchool/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${book.title}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  if (!isValidEpub(buffer, contentType)) throw new Error(`${book.title}: 无效 EPUB`);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const fileName = `${book.id}.epub`;
  fs.writeFileSync(path.join(booksDir, fileName), buffer);
  return {
    id: book.id,
    title: book.title,
    fileName,
    bytes: buffer.length,
    sha256,
    sourcePage: book.sourcePage,
    exportUrl: url,
    license: book.license,
    verifiedAt: new Date().toISOString(),
  };
}

function writeLicenseDocument(records) {
  const rows = records.map((record) => (
    `| ${record.title} | ${record.bytes} | \`${record.sha256}\` | ${record.license} |`
  )).join('\n');
  const content = `# 学堂书目与许可

更新时间：${new Date().toISOString()}

本目录只收录公版古籍及开放许可电子文本。电子书由中文维基文库作品页经 Wikimedia Wikisource Export 服务导出为 EPUB。APP 首次使用时从项目的 GitHub Pages 书库下载，下载后保存在设备本地。

| 书名 | 字节数 | SHA-256 | 权利说明 |
|---|---:|---|---|
${rows}

## 使用说明

- 古籍原作已进入公版领域。
- 维基文库整理文本按来源页面所示的 CC BY-SA 许可使用。
- APP 书籍详情保留来源页面和许可说明。
- 本项目不采用来源不明的网盘、论坛附件、盗版 PDF 或现代商业出版物。
`;
  fs.writeFileSync(path.join(root, 'docs', '学堂书目与许可.md'), content, 'utf8');
}

async function main() {
  fs.mkdirSync(booksDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const records = [];
  for (const book of SCHOOL_CATALOG) {
    process.stdout.write(`下载 ${book.title} ... `);
    const record = await downloadBook(book);
    records.push(record);
    console.log(`${record.bytes} bytes`);
  }
  fs.writeFileSync(
    path.join(dataDir, 'school-books.json'),
    JSON.stringify(SCHOOL_CATALOG, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(dataDir, 'school-books-lock.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), books: records }, null, 2),
    'utf8',
  );
  writeLicenseDocument(records);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
