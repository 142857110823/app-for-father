// daliuren/index.js — 对外接口
const daliuren = require('./engine/daliuren.js');
const rules = require('./rules/daliuren-rules-v1.js');

module.exports = daliuren;
module.exports.rules = rules;
