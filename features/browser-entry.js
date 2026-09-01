// features/browser-entry.js — 浏览器端入口
// 将四个功能的纯函数算法打包为浏览器全局对象
// UI/持久化/AI 不写入此文件

const bazi = require('./bazi/index.js');
const ziwei = require('./ziwei/index.js');
const meihua = require('./meihua/index.js');
const daliuren = require('./daliuren/index.js');
const calendar = require('./calendar-core/index.js');

if (typeof window !== 'undefined') {
  window.Features = {
    bazi,
    ziwei,
    meihua,
    daliuren,
    calendar,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bazi, ziwei, meihua, daliuren, calendar };
}
