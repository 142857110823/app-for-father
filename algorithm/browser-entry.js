// 浏览器端入口：将 Node 算法打包为浏览器可用的全局对象
const { fullPaiPan, fullPaiPanFromTime, getFourPillars } = require('./pillars.js');
const { SHEN, XING, MEN } = require('./qimen.js');

if (typeof window !== 'undefined') {
  window.QiMenAlgorithm = { fullPaiPan, fullPaiPanFromTime, getFourPillars, SHEN, XING, MEN };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fullPaiPan, fullPaiPanFromTime, getFourPillars, SHEN, XING, MEN };
}
