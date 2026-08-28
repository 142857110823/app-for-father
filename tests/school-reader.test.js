const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTheme,
  normalizeFontScale,
  createProgressThrottler,
  readBlobAsArrayBuffer,
} = require('../school-reader.js');

test('reader accepts only supported themes', () => {
  assert.equal(normalizeTheme('paper'), 'paper');
  assert.equal(normalizeTheme('eye'), 'eye');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('unknown'), 'paper');
});

test('reader clamps font scale to four supported levels', () => {
  assert.equal(normalizeFontScale(0.5), 0.9);
  assert.equal(normalizeFontScale(1), 1);
  assert.equal(normalizeFontScale(1.12), 1.15);
  assert.equal(normalizeFontScale(2), 1.3);
});

test('progress throttler persists the latest position after the delay', async () => {
  const saved = [];
  const throttled = createProgressThrottler(
    (value) => saved.push(value),
    10,
  );

  throttled({ cfi: 'a', percentage: 0.1 });
  throttled({ cfi: 'b', percentage: 0.2 });
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.deepEqual(saved, [{ cfi: 'b', percentage: 0.2 }]);
});

test('reader converts a blob into an array buffer', async () => {
  const blob = new Blob([Uint8Array.from([1, 2, 3])]);
  const buffer = await readBlobAsArrayBuffer(blob);
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [1, 2, 3]);
});

test('reader serializes settings and location without overwriting newer settings', async () => {
  const saved = [];
  const reader = new (require('../school-reader.js').SchoolReader)({
    store: { async saveProgress(value) { saved.push({ ...value }); } },
  });
  reader.currentBookId = 'book-1';
  reader.progressState = { bookId: 'book-1', theme: 'paper', fontScale: 1 };

  reader.saveProgressSoon({ cfi: 'location-1', percentage: 0.25 });
  await reader.saveSettings({ theme: 'dark' });
  await new Promise((resolve) => setTimeout(resolve, 450));
  await reader.settingsSavePromise;

  assert.equal(saved.at(-1).theme, 'dark');
  assert.equal(saved.at(-1).cfi, 'location-1');
});

test('reader save queue recovers after a storage failure', async () => {
  let calls = 0;
  const reader = new (require('../school-reader.js').SchoolReader)({
    store: {
      async saveProgress() {
        calls += 1;
        if (calls === 1) throw new Error('temporary failure');
      },
    },
  });
  reader.currentBookId = 'book-1';
  reader.progressState = { bookId: 'book-1' };

  await assert.rejects(() => reader.saveSettings({ theme: 'eye' }), /temporary failure/);
  await reader.saveSettings({ fontScale: 1.15 });

  assert.equal(calls, 2);
});

test('reader flushes a pending location to the original book when switching books', async () => {
  const saved = [];
  const reader = new (require('../school-reader.js').SchoolReader)({
    store: { async saveProgress(value) { saved.push({ ...value }); } },
  });
  reader.currentBookId = 'book-a';
  reader.progressState = { bookId: 'book-a', theme: 'paper', fontScale: 1 };
  reader.saveProgressSoon({ bookId: 'book-a', cfi: 'a-position', percentage: 0.4 });

  reader.close();
  reader.currentBookId = 'book-b';
  reader.progressState = { bookId: 'book-b', theme: 'dark', fontScale: 1.15 };
  await reader.settingsSavePromise;

  assert.equal(saved[0].bookId, 'book-a');
  assert.equal(saved[0].cfi, 'a-position');
});

test('SchoolReader exposes openByUrl method', () => {
  const { SchoolReader } = require('../school-reader.js');
  const reader = new SchoolReader({ store: {}, catalog: [] });
  assert.equal(typeof reader.openByUrl, 'function');
});
