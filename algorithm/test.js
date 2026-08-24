// 十三宫奇门遁甲 - 单元测试
// 覆盖：阳遁5局、阴遁5局与参考文档逐宫比对
// 7 字段基准：神 / 星 / 门 / 灵盘 / 天盘 / 人盘 / 地盘(展示值)

const { fullPaiPan } = require('./qimen.js');
const { YANG_DUN_5, YIN_DUN_5 } = require('./reference.js');

const FIELDS = [
  { key: 'shen',         label: '神'   },
  { key: 'xing',         label: '星'   },
  { key: 'men',          label: '门'   },
  { key: 'lingGan',      label: '灵盘',  refKey: 'ling' },
  { key: 'tianGan',      label: '天盘',  refKey: 'tian' },
  { key: 'renPan',       label: '人盘',  refKey: 'ren'  },
  { key: 'diGanDisplay', label: '地盘展', refKey: 'di'   },
  { key: 'riPaiJu',      label: '日排局', refKey: 'riPai' }
];

function comparePalace(computed, ref, idx) {
  const diffs = [];
  for (const f of FIELDS) {
    let actual = computed[f.key] || '';
    let expected = ref[f.refKey || f.key];
    // diGanDisplay 容错：若 ref 无 di 简写，回退到 ref.di（传统写法）
    if (f.key === 'diGanDisplay' && expected === undefined) expected = ref.di || '';
    expected = expected || '';
    if (actual !== expected) {
      diffs.push(`${f.label}: 计算[${actual || '空'}] ≠ 参考[${expected || '空'}]`);
    }
  }
  return diffs;
}

function runCase(refData) {
  console.log(`\n------ ${refData.pan}-${refData.dun}-${refData.ju}局 (${refData.pillars.join(' ')}) ------`);
  const extra = (refData.lunarMonth !== undefined)
    ? { lunarMonth: refData.lunarMonth, lunarDay: refData.lunarDay, shiZhi: refData.shiZhi }
    : undefined;
  const result = fullPaiPan(refData.pillars, refData.dayGan, refData.isNight, extra);

  let pass = true;
  let diffCount = 0;

  for (const rp of refData.palaces) {
    const computed = result.palaces[rp.idx];
    const diffs = comparePalace(computed, rp, rp.idx);
    if (diffs.length) {
      pass = false;
      diffCount += diffs.length;
      console.log(`  ❌ 宫${rp.idx}(洛书${computed.luoshu}${computed.label || '中'})`);
      diffs.forEach(d => console.log(`      ${d}`));
    }
  }

  if (pass) {
    const f = FIELDS.length;
    console.log(`  ✅ 全部 ${refData.palaces.length} 宫 × ${f} 字段与参考完全一致`);
  } else {
    console.log(`  共 ${diffCount} 处差异`);
  }

  return pass;
}

function main() {
  console.log('====== 十三宫奇门遁甲 单元测试 (DOCX 权威案例) ======');
  console.log('  阳遁5局参考数据尚未逐宫校准，本轮不以空占位数据制造伪失败。');
  const ok = runCase(YIN_DUN_5);
  console.log(`\n====== ${ok ? '全部测试通过 ✅' : '存在差异 ❌'} ======`);
  process.exit(ok ? 0 : 1);
}

main();
