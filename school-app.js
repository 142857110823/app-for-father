(function initSchoolApp(globalScope) {
  'use strict';

  if (!globalScope.SCHOOL_CATALOG || !globalScope.SchoolBookStore || !globalScope.SchoolReader) return;

  const store = new globalScope.SchoolBookStore();
  const runtimeCatalog = globalScope.SCHOOL_CATALOG.map((book) => ({
    ...book,
    downloadUrls: resolveBookUrls(book),
  }));
  const manager = new globalScope.BookDownloadManager({ catalog: runtimeCatalog, store });
  const reader = new globalScope.SchoolReader({ catalog: runtimeCatalog, store });
  const localBooks = new Map();
  let initialized = false;
  let autoDownloadStarted = false;
  let storagePersistent = null;

  function resolveBookUrls(book) {
    const capacitor = globalScope.Capacitor;
    const isNativeRuntime = Boolean(
      capacitor
      && typeof capacitor.isNativePlatform === 'function'
      && capacitor.isNativePlatform()
    );
    return globalScope.buildBookDownloadUrls(book, globalScope.location, isNativeRuntime);
  }

  function formatBytes(value) {
    if (!Number.isFinite(value) || value <= 0) return '待下载';
    if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDisplayState(book) {
    const state = manager.getState(book.id);
    if (state.status !== 'idle') return state;
    const local = localBooks.get(book.id);
    return local
      ? { id: book.id, status: 'ready', progress: 1, bytes: local.bytes }
      : state;
  }

  function renderSchoolLibrary() {
    const list = globalScope.document.getElementById('school-book-list');
    if (!list) return;
    ensureStatusBar(list);
    list.innerHTML = runtimeCatalog.map((book) => {
      const state = getDisplayState(book);
      const isReady = state.status === 'ready';
      const isDownloading = state.status === 'downloading';
      const progress = isReady ? 100 : isDownloading ? 38 : 0;
      return `
        <article class="school-book" data-book-id="${escapeHtml(book.id)}">
          <div class="school-book-cover" aria-hidden="true">${escapeHtml(book.title.slice(0, 1))}</div>
          <div class="school-book-info">
            <div class="school-book-title">${escapeHtml(book.title)}</div>
            <div class="school-book-desc">${escapeHtml(book.description)}</div>
            <div class="school-book-meta">${escapeHtml(book.category)} · ${escapeHtml(book.author)} · ${formatBytes(state.bytes)}</div>
            <div class="school-book-license">${escapeHtml(book.license)} · <a href="${escapeHtml(book.sourcePage)}" target="_blank" rel="noopener">来源</a></div>
            <div class="school-book-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
          </div>
          <div class="school-book-controls">
            <button class="school-book-read" data-action="read" data-book-id="${escapeHtml(book.id)}">阅读</button>
            <button class="school-book-download" data-action="download" data-status="${state.status}" data-book-id="${escapeHtml(book.id)}">${
              isReady ? '已下载' : isDownloading ? '下载中' : state.status === 'error' ? '重试' : '下载离线'
            }</button>
            ${isReady ? '<button class="school-book-remove" data-action="remove" data-book-id="' + escapeHtml(book.id) + '" title="删除离线文件" aria-label="删除离线文件">×</button>' : ''}
          </div>
        </article>`;
    }).join('');
    list.onclick = handleBookAction;
    updateStatusBar();
  }

  function ensureStatusBar(list) {
    if (globalScope.document.getElementById('school-library-status')) return;
    const status = globalScope.document.createElement('div');
    status.id = 'school-library-status';
    status.className = 'school-library-status';
    status.innerHTML = `
      <div><strong>离线书库</strong><span id="school-library-summary">正在检查本地书籍</span></div>
      <button class="school-download-all" id="school-download-all">全部下载</button>`;
    list.parentNode.insertBefore(status, list);
    status.querySelector('button').addEventListener('click', () => downloadMissingBooks());
  }

  function updateStatusBar(message) {
    const summary = globalScope.document.getElementById('school-library-summary');
    const button = globalScope.document.getElementById('school-download-all');
    if (!summary || !button) return;
    const ready = runtimeCatalog.filter((book) => getDisplayState(book).status === 'ready').length;
    const downloading = runtimeCatalog.some((book) => getDisplayState(book).status === 'downloading');
    const persistenceNote = storagePersistent === false ? '（浏览器可能清理缓存）' : '';
    summary.textContent = message || (globalScope.navigator.onLine
      ? `已离线保存 ${ready}/${runtimeCatalog.length} 本${persistenceNote}`
      : `当前离线，可阅读 ${ready} 本${persistenceNote}`);
    button.disabled = downloading || ready === runtimeCatalog.length || !globalScope.navigator.onLine;
    button.textContent = ready === runtimeCatalog.length ? '已全部下载' : downloading ? '下载中' : '全部下载';
  }

  async function handleBookAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const bookId = button.dataset.bookId;
    if (!bookId) return;

    if (action === 'read') {
      openBook(bookId);
      return;
    }
    if (action === 'download') {
      await downloadOne(bookId);
      return;
    }
    if (action === 'remove') {
      await removeBook(bookId);
      return;
    }
  }

  async function downloadOne(id) {
    updateStatusBar('正在下载并校验电子书');
    renderSchoolLibrary();
    try {
      await manager.downloadBook(id);
      const record = await store.getBook(id);
      localBooks.set(id, record);
    } catch (error) {
      updateStatusBar(error.message || '下载失败，请稍后重试');
    }
    renderSchoolLibrary();
  }

  async function downloadMissingBooks() {
    if (!globalScope.navigator.onLine) {
      updateStatusBar('当前无网络，已下载书籍仍可阅读');
      return;
    }
    const queue = runtimeCatalog
      .filter((book) => !localBooks.has(book.id) && manager.getState(book.id).status !== 'ready')
      .map((book) => book.id);
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        await downloadOne(id);
      }
    };
    await Promise.all([worker(), worker()]);
  }

  async function openBook(id) {
    try {
      await reader.open(id);
    } catch (error) {
      updateStatusBar(error.message || '电子书打开失败');
    }
  }

  async function removeBook(id) {
    await store.deleteBook(id);
    localBooks.delete(id);
    manager.states.delete(id);
    renderSchoolLibrary();
  }

  async function initSchoolPage() {
    if (!initialized) {
      const books = await store.getAllBooks().catch(() => []);
      for (const localBook of books) {
        const catalogBook = runtimeCatalog.find((book) => book.id === localBook.id);
        let valid = globalScope.isStoredBookMetadataValid(localBook, catalogBook);
        try {
          if (valid) {
            const actualHash = await globalScope.calculateSha256(
              await globalScope.readBlobAsArrayBuffer(localBook.blob),
            );
            valid = actualHash === catalogBook.sha256;
          }
        } catch (error) {
          valid = false;
        }
        if (valid) localBooks.set(localBook.id, localBook);
        else await store.deleteBook(localBook.id).catch(() => {});
      }
      if (globalScope.navigator.storage && globalScope.navigator.storage.persist) {
        storagePersistent = await globalScope.navigator.storage.persist().catch(() => false);
      }
      manager.subscribe(() => renderSchoolLibrary());
      globalScope.addEventListener('online', () => updateStatusBar());
      globalScope.addEventListener('offline', () => updateStatusBar());
      initialized = true;
    }
    renderSchoolLibrary();
    if (!autoDownloadStarted && globalScope.navigator.onLine && localBooks.size < runtimeCatalog.length) {
      autoDownloadStarted = true;
      downloadMissingBooks();
    }
  }

  globalScope.initSchoolPage = initSchoolPage;
  globalScope.openBook = (value) => {
    const book = typeof value === 'number' ? runtimeCatalog[value] : runtimeCatalog.find((item) => item.id === value);
    if (book) openBook(book.id);
  };
  globalScope.QimenSchool = {
    store,
    manager,
    reader,
    catalog: runtimeCatalog,
    initSchoolPage,
    getStoragePersistent: () => storagePersistent,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
