// calendar-core/index.js — 统一对外接口
const cal = require('./engine/calendar.js');

module.exports = cal;
module.exports.CALENDAR_VERSION = cal.CALENDAR_VERSION;
