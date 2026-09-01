// 浏览器端入口：将 Node 算法打包为浏览器可用的全局对象
const { fullPaiPan, fullPaiPanFromTime, getFourPillars, solarToLunar, lunarToSolar } = require('./pillars.js');
const { SHEN, XING, MEN, MEN_DISPLAY } = require('./qimen.js');

if (typeof window !== 'undefined') {
  window.QiMenAlgorithm = { fullPaiPan, fullPaiPanFromTime, getFourPillars, solarToLunar, lunarToSolar, SHEN, XING, MEN, MEN_DISPLAY };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fullPaiPan, fullPaiPanFromTime, getFourPillars, solarToLunar, lunarToSolar, SHEN, XING, MEN, MEN_DISPLAY };
}
