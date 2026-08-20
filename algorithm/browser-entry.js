// 浏览器端入口：将 Node 算法打包为浏览器可用的全局对象
const { fullPaiPan } = require('./pillars.js');

if (typeof window !== 'undefined') {
  window.QiMenAlgorithm = { fullPaiPan };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fullPaiPan };
}
