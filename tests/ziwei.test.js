/**
 * 紫微斗数排盘引擎测试（数据层，UI 不测）
 * 运行：node --test tests/ziwei.test.js
 *
 * 引擎：iztro@2.6.0（vendor/iztro.min.js UMD 构建）
 * 断言依据（联网查证 + 手工推算双重核验）：
 *  - iztro 官方文档/在线排盘 playground：https://iztro.com 、https://ziwei.pub
 *  - 传统安星诀手工推算（寅起正月顺数生月、再逆数生时为命宫；命宫干支纳音定五行局；
 *    五行局数+农历生日安紫微）：
 *    http://feiyuntiegui.com/?id=2498 《第二章紫微斗数排盘方法》
 *    https://zhanbugua.com/wen/9f1f0b332c8919ac.html 《手把手教你紫微斗数手工排盘》
 *
 * 案例① 手工推算过程（2000-01-01 12:00 男，午时）：
 *  - 农历：一九九九年冬月廿五（己卯年十一月廿五，午时）
 *  - 定命宫：寅起正月顺数至十一月落子宫，自子起子时逆数至午时落午宫 → 命宫在午（午时生人命身同宫）
 *  - 定身宫：自子（十一月宫）起子时顺数至午时落午宫 → 身宫在午
 *  - 五行局：己年五虎遁"甲己起丙寅"，午宫为庚午，纳音路旁土 → 土五局
 *  - 安紫微：土五局 + 农历廿五，(25+0)/5=5（x=0 偶数），寅起顺数 5 宫至午 → 紫微在午（命宫主星紫微庙）
 *  - 命主：命宫地支午 → 破军；身主：生年支卯 → 天同
 *  - 生年四化（年干己）：武曲禄、贪狼权、天梁科、文曲忌
 */
const test = require('node:test');
const assert = require('node:assert');
const FeaturesZiwei = require('../js/ziwei.js');

// 十二地支固定顺序（iztro palaces 索引对应，标准逆时针排布）
const BRANCH_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const EXPECTED_ROLES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];

test('案例①：2000-01-01 12:00 男（公历）→ 命宫午/紫微庙/土五局/命主破军/身主天同', () => {
  const r = FeaturesZiwei.paiPan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: '男' });

  // 命宫/身宫（午时生人命身同宫）
  assert.strictEqual(r.soulPalace, '午', '命宫应在午宫');
  assert.strictEqual(r.bodyPalace, '午', '身宫应在午宫');
  assert.strictEqual(r.soulIndex, 4, '命宫索引应为 4（午）');
  assert.strictEqual(r.bodyIndex, 4, '身宫索引应为 4（午）');

  // 五行局（命宫庚午，纳音路旁土）
  assert.strictEqual(r.fiveElementClass, '土五局');

  // 命宫主星：紫微（庙）
  const soul = r.palaces[r.soulIndex];
  assert.strictEqual(soul.majorStars.length, 1);
  assert.strictEqual(soul.majorStars[0].name, '紫微');
  assert.strictEqual(soul.majorStars[0].brightness, '庙');

  // 命主/身主
  assert.strictEqual(r.soul, '破军');
  assert.strictEqual(r.body, '天同');

  // 农历：一九九九年冬月廿五
  assert.strictEqual(r.lunarDate.lunarYear, 1999);
  assert.strictEqual(r.lunarDate.lunarMonth, 11);
  assert.strictEqual(r.lunarDate.lunarDay, 25);
  assert.strictEqual(r.lunarDate.isLeap, false);
  assert.strictEqual(r.lunarDate.text, '一九九九年冬月廿五');

  // 生年四化（年干己）：武曲禄、贪狼权、天梁科、文曲忌
  const allMutagens = [];
  r.palaces.forEach((p) => p.transformations.forEach((t) => allMutagens.push(t.star + t.type)));
  assert.ok(allMutagens.includes('武曲禄'), '应有 武曲禄');
  assert.ok(allMutagens.includes('贪狼权'), '应有 贪狼权');
  assert.ok(allMutagens.includes('天梁科'), '应有 天梁科');
  assert.ok(allMutagens.includes('文曲忌'), '应有 文曲忌');
  assert.strictEqual(allMutagens.length, 4, '生年四化应恰好 4 颗');
});

test('案例②：1990-05-15 14:30 女 → 12宫/四化4颗/五行局格式合法', () => {
  const r = FeaturesZiwei.paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '女' });

  assert.strictEqual(r.palaces.length, 12, '应为十二宫');
  assert.strictEqual(r.gender, '女');

  // 命宫戌、身宫子（四月巳宫逆数未时→戌为命宫；顺数未时→子为身宫）
  assert.strictEqual(r.soulPalace, '戌');
  assert.strictEqual(r.bodyPalace, '子');

  // 命宫主星：紫微（得）、天相（得）
  const soul = r.palaces[r.soulIndex];
  assert.strictEqual(soul.majorStars.map((s) => s.name).join(','), '紫微,天相');

  // 五行局格式合法
  assert.match(r.fiveElementClass, /^[水木金土火][二三四五六]局$/, '五行局格式应为"水二/木三/金四/土五/火六局"');

  // 生年四化恰好 4 颗（年干庚：太阳禄、武曲权、太阴科、天同忌）
  const allMutagens = [];
  r.palaces.forEach((p) => p.transformations.forEach((t) => allMutagens.push(t.star + t.type)));
  assert.strictEqual(allMutagens.length, 4);
  assert.ok(allMutagens.includes('太阳禄'));
  assert.ok(allMutagens.includes('武曲权'));
  assert.ok(allMutagens.includes('太阴科'));
  assert.ok(allMutagens.includes('天同忌'));

  // 四化类型只允许 禄|权|科|忌
  r.palaces.forEach((p) => p.transformations.forEach((t) => {
    assert.ok(['禄', '权', '科', '忌'].includes(t.type), '四化类型非法: ' + t.type);
  }));

  // 农历：一九九〇年四月廿一
  assert.strictEqual(r.lunarDate.lunarMonth, 4);
  assert.strictEqual(r.lunarDate.lunarDay, 21);
});

test('palaces 地支顺序为固定排布（寅卯辰巳午未申酉戌亥子丑）', () => {
  const r = FeaturesZiwei.paiPan({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: '男' });
  const branches = r.palaces.map((p) => p.earthlyBranch);
  assert.deepStrictEqual(branches, BRANCH_ORDER);
  // idx 与数组下标一致
  r.palaces.forEach((p, i) => assert.strictEqual(p.idx, i));
});

test('每宫 role 无重复且为标准十二宫职', () => {
  const r = FeaturesZiwei.paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '女' });
  const roles = r.palaces.map((p) => p.role);
  assert.strictEqual(new Set(roles).size, 12, '十二宫职不应重复');
  roles.forEach((role) => assert.ok(EXPECTED_ROLES.includes(role), '非法宫职: ' + role));
});

test('命宫/身宫索引有效，命宫身宫标记唯一，大限区间格式合法', () => {
  const r = FeaturesZiwei.paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '女' });
  assert.ok(r.soulIndex >= 0 && r.soulIndex < 12, '命宫索引应在 0-11');
  assert.ok(r.bodyIndex >= 0 && r.bodyIndex < 12, '身宫索引应在 0-11');
  assert.strictEqual(r.palaces.filter((p) => p.isSoul).length, 1, '命宫标记应唯一');
  assert.strictEqual(r.palaces.filter((p) => p.isBody).length, 1, '身宫标记应唯一');
  assert.strictEqual(r.palaces[r.soulIndex].isSoul, true);
  assert.strictEqual(r.palaces[r.bodyIndex].isBody, true);
  r.palaces.forEach((p) => assert.match(p.daXianRange, /^\d+-\d+$/, '大限区间格式应为"起-止"'));
});

test('入参异常时抛出明确错误', () => {
  assert.throws(() => FeaturesZiwei.paiPan({}), /入参缺失/);
});