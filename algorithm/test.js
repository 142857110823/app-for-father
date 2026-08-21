// 十三宫奇门遁甲 - 单元测试
// 覆盖：阳遁5局、阴遁5局与参考文档逐宫比对

const { fullPaiPan } = require('./qimen.js');
const { YANG_DUN_5, YIN_DUN_5 } = require('./reference.js');

const FIELDS = [
  { key: 'shen', label: '神' },
  { key: 'xing', label: '星' },
  { key: 'men', label: '门' },
  { key: 'tianGan', label: '天盘干', refKey: 'tian' },
  { key: 'diGan', label: '地盘干', refKey: 'di' },
  { key: 'anGan', label: '暗干', refKey: 'an' }
];

function comparePalace(computed, ref, idx) {
  const diffs = [];
  for (const f of FIELDS) {
    const actual = computed[f.key] || '';
    const expected = ref[f.refKey || f.key] || '';
    if (actual !== expected) {
      diffs.push(`${f.label}: 计算[${actual || '空'}] ≠ 参考[${expected || '空'}]`);
    }
  }
  return diffs;
}

function runCase(refData) {
  console.log(`\n------ ${refData.pan}-${refData.dun}-${refData.ju}局 (${refData.pillars.join(' ')}) ------`);
  const result = fullPaiPan(refData.pillars, refData.dayGan, refData.isNight);

  let pass = true;
  let diffCount = 0;

  for (const rp of refData.palaces) {
    const computed = result.palaces[rp.idx];
    const diffs = comparePalace(computed, rp, rp.idx);
    if (diffs.length) {
      pass = false;
      diffCount += diffs.length;
      console.log(`  ❌ 宫${rp.idx + 1}(洛书${computed.luoshu}${computed.label || '中'})`);
      diffs.forEach(d => console.log(`      ${d}`));
    }
  }

  if (pass) {
    console.log(`  ✅ 全部 ${refData.palaces.length} 宫与参考完全一致`);
  } else {
    console.log(`  共 ${diffCount} 处差异`);
  }

  return pass;
}

function main() {
  console.log('====== 十三宫奇门遁甲 单元测试 ======');
  const ok1 = runCase(YANG_DUN_5);
  const ok2 = runCase(YIN_DUN_5);
  const ok = ok1 && ok2;
  console.log(`\n====== ${ok ? '全部测试通过 ✅' : '存在差异 ❌'} ======`);
  process.exit(ok ? 0 : 1);
}

main();
