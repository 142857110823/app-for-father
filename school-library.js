(function initSchoolLibrary(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) Object.assign(globalScope, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function schoolLibraryFactory(globalScope) {
  'use strict';

  const WIKISOURCE = 'https://zh.wikisource.org/wiki/';
  const BOOK_HOST = 'https://142857110823.github.io/app-for-father/books/';
  const BOOK_RAW_HOST = 'https://raw.githubusercontent.com/142857110823/app-for-father/master/docs/books/';

  const SCHOOL_CATALOG = Object.freeze([
    {
      id: 'qimen-tongzong',
      title: '奇門遁甲統宗',
      author: '佚名',
      category: '奇门主典',
      description: '系统汇集奇门遁甲源流、起局、格局与占验方法的传统典籍。',
      sourcePage: `${WIKISOURCE}%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2%E7%B5%B1%E5%AE%97`,
      downloadUrl: `${BOOK_HOST}qimen-tongzong.epub`,
      exportTitle: '奇門遁甲統宗',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 81310,
      sha256: 'c3c844c32f38f41eb42715ab9f8ccd8bba2604844474562f06d0e10b3502147c',
    },
    {
      id: 'qimen-yuanling',
      title: '奇門遁甲元靈經',
      author: '清·隱溪居士',
      category: '奇门主典',
      description: '从动静、吉凶、生克、制伏等角度阐释奇门理法。',
      sourcePage: `${WIKISOURCE}%E5%A5%87%E9%96%80%E9%81%81%E7%94%B2%E5%85%83%E9%9D%88%E7%B6%93`,
      downloadUrl: `${BOOK_HOST}qimen-yuanling.epub`,
      exportTitle: '奇門遁甲元靈經',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 69683,
      sha256: '9fe76a276d19b6370edd7b740912b2abae58c82c8a3753b99efef73fef022b32',
    },
    {
      id: 'dunjia-yanyi',
      title: '遁甲演義（四庫全書本）',
      author: '明·程道生',
      category: '奇门主典',
      description: '四库全书本遁甲典籍，涵盖排局方法、九星八门与占断。',
      sourcePage: `${WIKISOURCE}%E9%81%81%E7%94%B2%E6%BC%94%E7%BE%A9_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)`,
      downloadUrl: `${BOOK_HOST}dunjia-yanyi.epub`,
      exportTitle: '遁甲演義 (四庫全書本)',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 156898,
      sha256: '8ad1bf727f40c407b44c3506c521d0873ca8c06cc152f64ac172d0e1e9d317fa',
    },
    {
      id: 'qimen-baojian',
      title: '奇门宝鉴御定',
      author: '清廷敕纂',
      category: '奇门主典',
      description: '清代官修奇门典籍，适合查阅局式、用法与传统术语。',
      sourcePage: `${WIKISOURCE}%E5%A5%87%E9%97%A8%E5%AE%9D%E9%89%B4%E5%BE%A1%E5%AE%9A`,
      downloadUrl: `${BOOK_HOST}qimen-baojian.epub`,
      exportTitle: '奇门宝鉴御定',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 63450,
      sha256: '80e89c20920ce371961dfa753a47f91e3d291219c4035c12803ab28c5a01b3f9',
    },
    {
      id: 'yanbo-diaosou',
      title: '煙波釣叟歌',
      author: '傳·趙普',
      category: '奇门歌诀',
      description: '奇门遁甲常用总纲歌诀，便于记忆阴阳遁、三奇六仪等规则。',
      sourcePage: `${WIKISOURCE}%E7%85%99%E6%B3%A2%E9%87%A3%E5%8F%9F%E6%AD%8C`,
      downloadUrl: `${BOOK_HOST}yanbo-diaosou.epub`,
      exportTitle: '煙波釣叟歌',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 26017,
      sha256: '0b1ae3b870c87bde29a41733d27676b1bfa42583b8fd281704029a3fbcee9c01',
    },
    {
      id: 'huangting-dunjia',
      title: '黃庭遁甲緣身經',
      author: '佚名',
      category: '遁甲道经',
      description: '道藏中的遁甲相关经典，用于理解遁甲与道教术数传统。',
      sourcePage: `${WIKISOURCE}%E9%BB%83%E5%BA%AD%E9%81%81%E7%94%B2%E7%B7%A3%E8%BA%AB%E7%B6%93`,
      downloadUrl: `${BOOK_HOST}huangting-dunjia.epub`,
      exportTitle: '黃庭遁甲緣身經',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 28095,
      sha256: 'b1ec2d61dc73778823378947ef354232739d7f326c3b6ed599f76c7a2444518a',
    },
    {
      id: 'taiyi-jinjing',
      title: '太乙金鏡式經（四庫全書本）',
      author: '唐·王希明',
      category: '三式旁参',
      description: '太乙术经典，与奇门、六壬并称三式，可用于比较术数框架。',
      sourcePage: `${WIKISOURCE}%E5%A4%AA%E4%B9%99%E9%87%91%E9%8F%A1%E5%BC%8F%E7%B6%93_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)`,
      downloadUrl: `${BOOK_HOST}taiyi-jinjing.epub`,
      exportTitle: '太乙金鏡式經 (四庫全書本)',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 160658,
      sha256: '3e1f84549723eca4d34741dfeee5688470c106c66d81677c4d43ff98bbd159fa',
    },
    {
      id: 'liuren-daquan',
      title: '六壬大全（四庫全書本）',
      author: '明·郭載騋等',
      category: '三式旁参',
      description: '六壬术汇编，与奇门遁甲并列参读，补充传统三式知识体系。',
      sourcePage: `${WIKISOURCE}%E5%85%AD%E5%A3%AC%E5%A4%A7%E5%85%A8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)`,
      downloadUrl: `${BOOK_HOST}liuren-daquan.epub`,
      exportTitle: '六壬大全 (四庫全書本)',
      license: '古籍原作公版；维基文库整理文本 CC BY-SA 4.0',
      expectedType: 'application/epub+zip',
      bytes: 823166,
      sha256: '95563ffc7a63d5029a06f984248b67528e6e433810a8f3c2a446eb86b515a5b8',
    },
  ]);

  function validateCatalog(catalog) {
    const errors = [];
    if (!Array.isArray(catalog) || catalog.length < 8) {
      errors.push('书目数量不得少于 8 本');
      if (!Array.isArray(catalog)) return { valid: false, errors };
    }
    const ids = new Set();
    const urls = new Set();
    for (const book of catalog) {
      if (!book.id || !book.title || !book.downloadUrl || !book.sourcePage) {
        errors.push('书目缺少必要字段');
        continue;
      }
      if (ids.has(book.id)) errors.push(`书目 ID 重复：${book.id}`);
      if (urls.has(book.downloadUrl)) errors.push(`下载地址重复：${book.downloadUrl}`);
      ids.add(book.id);
      urls.add(book.downloadUrl);
    }
    return { valid: errors.length === 0, errors };
  }

  function buildBookDownloadUrls(book, location, isNativeRuntime = false) {
    const urls = [];
    const add = (url) => {
      if (url && !urls.includes(url)) urls.push(url);
    };
    const host = location && location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (isLocalHost && !isNativeRuntime) {
      add(`${location.origin}/books/${book.id}.epub`);
      add(`${location.origin}/docs/books/${book.id}.epub`);
    }
    for (const url of book.downloadUrls || []) add(url);
    add(book.downloadUrl);
    add(`${BOOK_RAW_HOST}${book.id}.epub`);
    return urls;
  }

  function asBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return new Uint8Array();
  }

  function isValidEpub(value, contentType) {
    const bytes = asBytes(value);
    const type = String(contentType || '').toLowerCase();
    return bytes.byteLength >= 4
      && bytes[0] === 0x50
      && bytes[1] === 0x4b
      && bytes[2] === 0x03
      && bytes[3] === 0x04
      && (
        type.includes('application/epub+zip')
        || type.includes('application/epub')
        || type.includes('application/octet-stream')
      );
  }

  async function calculateSha256(buffer) {
    const bytes = asBytes(buffer);
    if (globalScope.crypto && globalScope.crypto.subtle) {
      const digest = await globalScope.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') {
      return require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    }
    throw new Error('当前环境不支持 SHA-256');
  }

  function isStoredBookMetadataValid(localBook, catalogBook) {
    return Boolean(
      localBook
      && catalogBook
      && localBook.blob
      && localBook.version === 1
      && localBook.bytes === catalogBook.bytes
      && localBook.sha256 === catalogBook.sha256
    );
  }

  class SchoolBookStore {
    constructor(options = {}) {
      this.dbName = options.dbName || 'qimen-school-library';
      this.dbVersion = 1;
      this.dbPromise = null;
    }

    open() {
      if (this.dbPromise) return this.dbPromise;
      if (!globalScope.indexedDB) return Promise.reject(new Error('当前环境不支持离线书库'));
      this.dbPromise = new Promise((resolve, reject) => {
        const request = globalScope.indexedDB.open(this.dbName, this.dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'bookId' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('离线书库打开失败'));
      });
      return this.dbPromise;
    }

    async run(storeName, mode, action) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);
        let result;
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('离线书库操作失败'));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error('离线书库事务失败'));
        transaction.onabort = () => reject(transaction.error || new Error('离线书库事务已中止'));
      });
    }

    saveBook(record) {
      return this.run('books', 'readwrite', (store) => store.put(record));
    }

    getBook(id) {
      return this.run('books', 'readonly', (store) => store.get(id));
    }

    getAllBooks() {
      return this.run('books', 'readonly', (store) => store.getAll());
    }

    deleteBook(id) {
      return this.run('books', 'readwrite', (store) => store.delete(id));
    }

    saveProgress(progress) {
      return this.run('progress', 'readwrite', (store) => store.put(progress));
    }

    getProgress(bookId) {
      return this.run('progress', 'readonly', (store) => store.get(bookId));
    }
  }

  function delay(ms) {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  class BookDownloadManager {
    constructor(options = {}) {
      this.catalog = options.catalog || SCHOOL_CATALOG;
      this.store = options.store || new SchoolBookStore();
      this.fetchImpl = options.fetchImpl || (globalScope.fetch && globalScope.fetch.bind(globalScope));
      this.now = options.now || (() => new Date().toISOString());
      this.maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 2;
      this.retryDelayMs = Number.isFinite(options.retryDelayMs) ? options.retryDelayMs : 500;
      this.states = new Map();
      this.listeners = new Set();
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    getState(id) {
      return this.states.get(id) || { id, status: 'idle', progress: 0 };
    }

    setState(id, patch) {
      const next = { ...this.getState(id), ...patch, id };
      this.states.set(id, next);
      for (const listener of this.listeners) listener(next);
      return next;
    }

    resolveBook(id) {
      const book = this.catalog.find((item) => item.id === id);
      if (!book) throw new Error(`未找到书籍：${id}`);
      return book;
    }

    async downloadBook(id) {
      const book = this.resolveBook(id);
      if (!this.fetchImpl) throw new Error('当前环境不支持下载');
      this.setState(id, { status: 'downloading', progress: 0, error: '' });

      let lastError;
      const urls = Array.isArray(book.downloadUrls) && book.downloadUrls.length
        ? book.downloadUrls
        : [book.downloadUrl];
      for (const url of urls) {
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
          try {
            const response = await this.fetchImpl(url);
            if (!response || !response.ok) {
              throw new Error(`下载失败（HTTP ${response ? response.status : '未知'}）`);
            }
            const contentType = response.headers && response.headers.get
              ? response.headers.get('content-type')
              : '';
            const buffer = await response.arrayBuffer();
            if (!isValidEpub(buffer, contentType)) throw new Error('下载结果不是有效 EPUB');
            const bytes = asBytes(buffer);
            const sha256 = await calculateSha256(bytes);
            if (book.sha256 && sha256 !== book.sha256) {
              throw new Error('电子书完整性校验失败');
            }
            if (book.bytes && bytes.byteLength !== book.bytes) {
              throw new Error('电子书文件大小校验失败');
            }
            const record = {
              id: book.id,
              blob: typeof Blob === 'function'
                ? new Blob([bytes], { type: 'application/epub+zip' })
                : bytes,
              bytes: bytes.byteLength,
              sha256,
              downloadedAt: this.now(),
              sourceUrl: book.sourcePage,
              downloadedFrom: url,
              version: 1,
            };
            await this.store.saveBook(record);
            return this.setState(id, { status: 'ready', progress: 1, bytes: record.bytes });
          } catch (error) {
            lastError = error;
            if (attempt < this.maxRetries) await delay(this.retryDelayMs * (attempt + 1));
          }
        }
      }

      this.setState(id, { status: 'error', progress: 0, error: lastError.message });
      throw lastError;
    }
  }

  return {
    SCHOOL_CATALOG,
    validateCatalog,
    isValidEpub,
    calculateSha256,
    buildBookDownloadUrls,
    isStoredBookMetadataValid,
    SchoolBookStore,
    BookDownloadManager,
  };
});
