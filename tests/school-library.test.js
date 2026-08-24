const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SCHOOL_CATALOG,
  validateCatalog,
  isValidEpub,
  calculateSha256,
  BookDownloadManager,
  isStoredBookMetadataValid,
  buildBookDownloadUrls,
} = require('../school-library.js');

function makeEpubBytes() {
  return Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
}

function testCatalog() {
  return SCHOOL_CATALOG.map((book) => ({ ...book, bytes: 0, sha256: '' }));
}

test('catalog contains at least eight unique legal ebook records', () => {
  assert.ok(SCHOOL_CATALOG.length >= 8);
  assert.equal(validateCatalog(SCHOOL_CATALOG).valid, true);
  assert.equal(new Set(SCHOOL_CATALOG.map((book) => book.id)).size, SCHOOL_CATALOG.length);
  assert.equal(new Set(SCHOOL_CATALOG.map((book) => book.downloadUrl)).size, SCHOOL_CATALOG.length);
  for (const book of SCHOOL_CATALOG) {
    assert.match(book.sourcePage, /^https:\/\/zh\.wikisource\.org\//);
    assert.match(book.license, /CC BY-SA|公版/);
    assert.match(book.sha256, /^[a-f0-9]{64}$/);
    assert.ok(book.bytes > 0);
  }
});

test('catalog validation rejects duplicate ids and urls', () => {
  const duplicate = [
    { ...SCHOOL_CATALOG[0] },
    { ...SCHOOL_CATALOG[0], title: '重复书目' },
  ];
  const result = validateCatalog(duplicate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('重复')));
});

test('book download urls include local static paths and verified remote fallbacks', () => {
  const book = SCHOOL_CATALOG[0];
  const urls = buildBookDownloadUrls(book, {
    origin: 'http://localhost:4173',
    hostname: 'localhost',
  });

  assert.deepEqual(urls.slice(0, 2), [
    `http://localhost:4173/books/${book.id}.epub`,
    `http://localhost:4173/docs/books/${book.id}.epub`,
  ]);
  assert.ok(urls.includes(book.downloadUrl));
  assert.ok(urls.some((url) => url.includes('raw.githubusercontent.com/142857110823/app-for-father/master/docs/books/')));
  assert.equal(new Set(urls).size, urls.length);
});

test('capacitor runtime keeps only remote verified download urls', () => {
  const book = SCHOOL_CATALOG[0];
  const urls = buildBookDownloadUrls(book, {
    origin: 'https://localhost',
    hostname: 'localhost',
    protocol: 'https:',
  }, true);

  assert.equal(urls.some((url) => url.startsWith('https://localhost/')), false);
  assert.equal(urls[0], book.downloadUrl);
  assert.ok(urls.some((url) => url.startsWith('https://raw.githubusercontent.com/')));
});

test('epub validation requires zip header, epub mime and non-empty payload', () => {
  assert.equal(isValidEpub(makeEpubBytes(), 'application/epub+zip'), true);
  assert.equal(isValidEpub(makeEpubBytes(), 'application/epub'), true);
  assert.equal(isValidEpub(Uint8Array.from([1, 2, 3, 4]), 'application/epub+zip'), false);
  assert.equal(isValidEpub(makeEpubBytes(), 'text/html'), false);
  assert.equal(isValidEpub(new Uint8Array(), 'application/epub+zip'), false);
});

test('sha256 is stable for the same payload', async () => {
  const bytes = new TextEncoder().encode('qimen-school');
  const first = await calculateSha256(bytes.buffer);
  const second = await calculateSha256(bytes.buffer);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('download manager stores only a valid epub and records metadata', async () => {
  const saved = [];
  const store = {
    async saveBook(record) {
      saved.push(record);
    },
  };
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/epub+zip' },
    arrayBuffer: async () => makeEpubBytes().buffer,
  });
  const manager = new BookDownloadManager({
    catalog: testCatalog(),
    store,
    fetchImpl,
    now: () => '2026-08-24T00:00:00.000Z',
  });

  const result = await manager.downloadBook(SCHOOL_CATALOG[0].id);

  assert.equal(result.status, 'ready');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, SCHOOL_CATALOG[0].id);
  assert.equal(saved[0].bytes, 6);
  assert.equal(saved[0].downloadedAt, '2026-08-24T00:00:00.000Z');
  assert.match(saved[0].sha256, /^[a-f0-9]{64}$/);
});

test('download manager does not store invalid or failed responses', async () => {
  const saved = [];
  const store = { async saveBook(record) { saved.push(record); } };
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html' },
    arrayBuffer: async () => new TextEncoder().encode('<html>blocked</html>').buffer,
  });
  const manager = new BookDownloadManager({
    catalog: testCatalog(),
    store,
    fetchImpl,
    retryDelayMs: 0,
  });

  await assert.rejects(() => manager.downloadBook(SCHOOL_CATALOG[0].id), /EPUB/);
  assert.equal(saved.length, 0);
  assert.equal(manager.getState(SCHOOL_CATALOG[0].id).status, 'error');
});

test('download manager rejects a valid epub whose checksum does not match the catalog', async () => {
  const saved = [];
  const catalog = [{ ...SCHOOL_CATALOG[0], sha256: '0'.repeat(64) }];
  const manager = new BookDownloadManager({
    catalog,
    store: { async saveBook(record) { saved.push(record); } },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/epub+zip' },
      arrayBuffer: async () => makeEpubBytes().buffer,
    }),
    maxRetries: 0,
  });

  await assert.rejects(() => manager.downloadBook(catalog[0].id), /校验失败/);
  assert.equal(saved.length, 0);
});

test('download manager reports state transitions', async () => {
  const transitions = [];
  const store = { async saveBook() {} };
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/epub+zip' },
    arrayBuffer: async () => makeEpubBytes().buffer,
  });
  const manager = new BookDownloadManager({ catalog: testCatalog(), store, fetchImpl });
  manager.subscribe((state) => transitions.push(state.status));

  await manager.downloadBook(SCHOOL_CATALOG[0].id);

  assert.deepEqual(transitions, ['downloading', 'ready']);
});

test('download manager falls back to the secondary verified source', async () => {
  const calls = [];
  const catalog = testCatalog();
  catalog[0].downloadUrls = ['https://primary.invalid/book.epub', 'https://backup.invalid/book.epub'];
  const manager = new BookDownloadManager({
    catalog,
    store: { async saveBook() {} },
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes('primary')) return { ok: false, status: 404 };
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/epub+zip' },
        arrayBuffer: async () => makeEpubBytes().buffer,
      };
    },
    maxRetries: 0,
  });

  const result = await manager.downloadBook(catalog[0].id);

  assert.equal(result.status, 'ready');
  assert.deepEqual(calls, catalog[0].downloadUrls);
});

test('cached book metadata requires the expected blob, size, hash and version', () => {
  const catalogBook = SCHOOL_CATALOG[0];
  const valid = {
    id: catalogBook.id,
    blob: new Blob([makeEpubBytes()]),
    bytes: catalogBook.bytes,
    sha256: catalogBook.sha256,
    version: 1,
  };
  assert.equal(isStoredBookMetadataValid(valid, catalogBook), true);
  assert.equal(isStoredBookMetadataValid({ ...valid, blob: null }, catalogBook), false);
  assert.equal(isStoredBookMetadataValid({ ...valid, bytes: 1 }, catalogBook), false);
  assert.equal(isStoredBookMetadataValid({ ...valid, sha256: '0'.repeat(64) }, catalogBook), false);
});
