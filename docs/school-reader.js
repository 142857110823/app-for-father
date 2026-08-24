(function initSchoolReader(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) Object.assign(globalScope, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function schoolReaderFactory(globalScope) {
  'use strict';

  const THEMES = new Set(['paper', 'eye', 'dark']);
  const FONT_SCALES = [0.9, 1, 1.15, 1.3];

  function normalizeTheme(theme) {
    return THEMES.has(theme) ? theme : 'paper';
  }

  function normalizeFontScale(value) {
    const numeric = Number(value);
    return FONT_SCALES.reduce((closest, item) => (
      Math.abs(item - numeric) < Math.abs(closest - numeric) ? item : closest
    ), FONT_SCALES[0]);
  }

  function createProgressThrottler(save, delayMs = 400) {
    let timer = null;
    let latest = null;
    function flush() {
      clearTimeout(timer);
      timer = null;
      if (!latest) return Promise.resolve();
      const value = latest;
      latest = null;
      return Promise.resolve(save(value));
    }
    function schedule(value) {
      latest = value;
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    }
    schedule.flush = flush;
    schedule.cancel = () => {
      clearTimeout(timer);
      timer = null;
      latest = null;
    };
    return schedule;
  }

  function readBlobAsArrayBuffer(blob) {
    if (!blob) return Promise.reject(new Error('电子书文件为空'));
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    if (typeof globalScope.FileReader !== 'function') {
      return Promise.reject(new Error('当前 WebView 不支持 EPUB 二进制读取'));
    }
    return new Promise((resolve, reject) => {
      const reader = new globalScope.FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('电子书二进制读取失败'));
      reader.readAsArrayBuffer(blob);
    });
  }

  class SchoolReader {
    constructor(options = {}) {
      this.store = options.store;
      this.catalog = options.catalog || [];
      this.root = null;
      this.book = null;
      this.rendition = null;
      this.currentBookId = '';
      this.currentTheme = 'paper';
      this.currentFontScale = 1;
      this.progressState = null;
      this.settingsSavePromise = Promise.resolve();
      this.saveProgressSoon = createProgressThrottler((progress) => {
        this.queueProgressSave(progress).catch(() => {});
      });
    }

    findBook(id) {
      return this.catalog.find((book) => book.id === id);
    }

    async open(bookId) {
      if (!globalScope.document || typeof globalScope.ePub !== 'function') {
        throw new Error('电子书阅读器未加载');
      }
      const localBook = await this.store.getBook(bookId);
      if (!localBook || !localBook.blob) throw new Error('请先下载本书');
      const metadata = this.findBook(bookId) || { title: '电子书' };
      const progress = await this.store.getProgress(bookId) || {};
      this.close();
      this.currentBookId = bookId;
      this.progressState = { bookId, ...progress };
      try {
        this.root = this.buildShell(metadata.title, progress);
        globalScope.document.body.appendChild(this.root);
        const buffer = await readBlobAsArrayBuffer(localBook.blob);
        this.book = globalScope.ePub(buffer);
        this.rendition = this.book.renderTo(this.root.querySelector('.school-reader-stage'), {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
        });
        this.registerThemes();
        this.setTheme(progress.theme || 'paper');
        this.setFontScale(progress.fontScale || 1);
        await this.rendition.display(progress.cfi || undefined);
        this.bindLocationSaving(progress);
        this.loadNavigation();
      } catch (error) {
        this.close();
        throw error;
      }
    }

    buildShell(title, progress) {
      const root = globalScope.document.createElement('div');
      root.className = 'school-reader-shell';
      root.dataset.theme = normalizeTheme(progress.theme);
      root.innerHTML = `
        <header class="school-reader-toolbar">
          <button class="sr-icon-btn" data-action="close" title="返回" aria-label="返回">‹</button>
          <div class="sr-book-title"></div>
          <button class="sr-icon-btn" data-action="toc" title="目录" aria-label="目录">☰</button>
          <button class="sr-icon-btn" data-action="display" title="显示设置" aria-label="显示设置">Aa</button>
        </header>
        <aside class="school-reader-panel" data-panel="toc" hidden>
          <div class="sr-panel-title">目录</div>
          <div class="sr-toc-list"></div>
        </aside>
        <aside class="school-reader-panel sr-display-panel" data-panel="display" hidden>
          <div class="sr-panel-title">显示设置</div>
          <div class="sr-setting-row">
            <span>字号</span>
            <div class="sr-segmented">
              <button data-scale="0.9">小</button><button data-scale="1">中</button>
              <button data-scale="1.15">大</button><button data-scale="1.3">特大</button>
            </div>
          </div>
          <div class="sr-setting-row">
            <span>主题</span>
            <div class="sr-theme-options">
              <button data-theme="paper" title="宣纸"></button>
              <button data-theme="eye" title="护眼"></button>
              <button data-theme="dark" title="夜间"></button>
            </div>
          </div>
        </aside>
        <main class="school-reader-stage"></main>
        <button class="sr-page-btn sr-prev" data-action="prev" title="上一页" aria-label="上一页">‹</button>
        <button class="sr-page-btn sr-next" data-action="next" title="下一页" aria-label="下一页">›</button>
        <footer class="school-reader-progress"><span>0%</span></footer>`;
      root.querySelector('.sr-book-title').textContent = title;
      root.addEventListener('click', (event) => this.handleClick(event));
      return root;
    }

    handleClick(event) {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'close') this.close();
      if (action === 'prev' && this.rendition) this.rendition.prev();
      if (action === 'next' && this.rendition) this.rendition.next();
      if (action === 'toc' || action === 'display') this.togglePanel(action);
      if (button.dataset.scale) this.setFontScale(button.dataset.scale);
      if (button.dataset.theme) this.setTheme(button.dataset.theme);
      if (button.dataset.href && this.rendition) {
        this.rendition.display(button.dataset.href);
        this.togglePanel('toc', false);
      }
    }

    togglePanel(name, force) {
      if (!this.root) return;
      for (const panel of this.root.querySelectorAll('.school-reader-panel')) {
        const selected = panel.dataset.panel === name;
        panel.hidden = selected ? (force === false ? true : !panel.hidden) : true;
      }
    }

    registerThemes() {
      this.rendition.themes.register('paper', {
        body: { color: '#211f1a', background: '#f7f5ef', 'font-family': '"STKaiti","KaiTi",serif' },
        a: { color: '#8a6a2f' },
      });
      this.rendition.themes.register('eye', {
        body: { color: '#223027', background: '#dfe8d8', 'font-family': '"STKaiti","KaiTi",serif' },
        a: { color: '#6f5d2c' },
      });
      this.rendition.themes.register('dark', {
        body: { color: '#e9e3d7', background: '#191a18', 'font-family': '"STKaiti","KaiTi",serif' },
        a: { color: '#c7a55a' },
      });
    }

    setTheme(theme) {
      const next = normalizeTheme(theme);
      this.currentTheme = next;
      if (this.root) this.root.dataset.theme = next;
      if (this.rendition) this.rendition.themes.select(next);
      this.saveSettings({ theme: next });
      return next;
    }

    setFontScale(value) {
      const next = normalizeFontScale(value);
      this.currentFontScale = next;
      if (this.rendition) this.rendition.themes.fontSize(`${Math.round(next * 100)}%`);
      if (this.root) {
        for (const button of this.root.querySelectorAll('[data-scale]')) {
          button.classList.toggle('active', Number(button.dataset.scale) === next);
        }
      }
      this.saveSettings({ fontScale: next });
      return next;
    }

    async saveSettings(patch) {
      return this.queueProgressSave(patch);
    }

    async queueProgressSave(patch) {
      const targetBookId = patch.bookId || this.currentBookId;
      if (!this.store || !targetBookId) return;
      const sameBookState = this.progressState && this.progressState.bookId === targetBookId
        ? this.progressState
        : { bookId: targetBookId };
      const nextState = {
        ...sameBookState,
        ...patch,
        bookId: targetBookId,
        updatedAt: new Date().toISOString(),
      };
      if (targetBookId === this.currentBookId) this.progressState = nextState;
      const snapshot = { ...nextState };
      this.settingsSavePromise = this.settingsSavePromise
        .catch(() => {})
        .then(() => this.store.saveProgress(snapshot));
      await this.settingsSavePromise;
    }

    bindLocationSaving(seed) {
      this.rendition.on('relocated', (location) => {
        const percentage = location.start && Number.isFinite(location.start.percentage)
          ? location.start.percentage
          : 0;
        const progress = {
          bookId: this.currentBookId,
          cfi: location.start.cfi,
          percentage,
          updatedAt: new Date().toISOString(),
        };
        this.progressState = { ...(this.progressState || {}), ...progress };
        if (this.root) this.root.querySelector('.school-reader-progress span').textContent = `${Math.round(percentage * 100)}%`;
        this.saveProgressSoon({ ...this.progressState });
      });
    }

    async loadNavigation() {
      const navigation = await this.book.loaded.navigation;
      const list = this.root && this.root.querySelector('.sr-toc-list');
      if (!list) return;
      while (list.firstChild) list.removeChild(list.firstChild);
      for (const item of navigation.toc || []) {
        const button = globalScope.document.createElement('button');
        button.dataset.href = item.href;
        button.textContent = item.label.trim();
        list.appendChild(button);
      }
    }

    close() {
      this.saveProgressSoon.flush();
      if (this.rendition) this.rendition.destroy();
      if (this.book) this.book.destroy();
      if (this.root) this.root.remove();
      this.rendition = null;
      this.book = null;
      this.root = null;
      this.currentBookId = '';
      this.progressState = null;
    }
  }

  return {
    normalizeTheme,
    normalizeFontScale,
    createProgressThrottler,
    readBlobAsArrayBuffer,
    SchoolReader,
  };
});
