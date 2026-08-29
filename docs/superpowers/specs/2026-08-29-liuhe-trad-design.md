# 2026-08-29 六合化合关系 + 简繁转换健壮性修复 设计文档

## 1. 背景与目标

### 1.1 任务一：六合化合关系
用户要求在外围 12 宫的排盘结果中，点击【灵盘 / 天盘 / 人盘 / 地盘】任意一干，都能显示对应的化合关系。化合关系包括：
- 天干五合（甲己、乙庚、丙辛、丁壬、戊癸）
- 地支六合（子丑、寅亥、卯戌、辰酉、巳申、午未）

参考文件：`F:\1\夫\六合\化合关系表.csv`。

### 1.2 任务二：简繁转换健壮性修复
用户反馈每次进行新的功能完善后，【简繁转换】都会“加载失败一次”。根因是 `opencc-full.js` 作为大体积依赖，在版本控制、三处入口同步、GitHub Pages 部署缓存等环节容易缺失或未及时加载，导致 `OpenCC` 对象未定义，切换时提示“简繁转换组件加载失败”。

## 2. 任务一：六合化合关系设计

### 2.1 数据来源
直接硬编码 `F:\1\夫\六合\化合关系表.csv` 中的 5 组天干五合 + 6 组地支六合，避免运行时读取文件。

```js
const TIAN_GAN_WU_HE = {
  '甲': '己', '己': '甲',
  '乙': '庚', '庚': '乙',
  '丙': '辛', '辛': '丙',
  '丁': '壬', '壬': '丁',
  '戊': '癸', '癸': '戊'
};

const DI_ZHI_LIU_HE = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午'
};
```

### 2.2 触发范围
- 仅外围 12 宫（`idx !== 12`）。
- 触发元素：灵盘（`pc-ling`）、天盘（`pc-tian`）、人盘（`pc-ren`）、地盘（`pc-di`）。
- 现有 `onclick="event.stopPropagation();showShengWang('ling',${cell.idx})"` 已经覆盖，不需要新增点击事件。

### 2.3 弹窗内容设计
在 `showShengWang(plate, idx)` 弹窗中，在「状态解读卡」与「各宫之干」之间插入一个「化合关系」区块：

```
┌─────────────────────────────────────┐
│ 【状态解读卡】                        │
│  甲 · 天盘 · 长生                     │
├─────────────────────────────────────┤
│ 【化合关系】                          │
│  天干五合：甲 ↔ 己（中正之合）        │
│  地支六合：子宫 ↔ 丑宫（子丑合土）    │
├─────────────────────────────────────┤
│ 【天盘各宫之干】                      │
├─────────────────────────────────────┤
│ 【生旺死绝表】                        │
└─────────────────────────────────────┘
```

- 天干五合需要给每一组配上名称（如“甲己合土”等），保持与命理常识一致。
- 地支六合需要给每一组配上名称（如“子丑合土”“寅亥合木”等）。
- 若当前宫位为中宫或地支未定义，则地支六合行显示“—”。

### 2.4 样式
复用现有弹窗的 `.detail-block`、`.type` 等类名；新增 `.liuhe-row` 用于每行化合关系，保持与弹窗内其他区块一致的暗金/墨色配色。

### 2.5 代码改动位置
- `public/index.html`：新增六合数据常量、新增六合关系构建函数 `buildLiuHeHtml(gan, branch)`、在 `showShengWang` 中插入调用。
- 同步到 `index.html`（根目录）和 `docs/index.html`。

## 3. 任务二：简繁转换健壮性修复设计

### 3.1 根因
- `opencc-full.js` 体积大（≈1.2MB），虽然已加入 Git，但在重新生成/同步入口文件时容易被遗漏或被 `.gitignore` 排除。
- `<script src="opencc-full.js">` 没有 `onload/onerror`，加载失败无感知。
- 用户首次点击【简繁转换】时，如果文件仍在加载或 GitHub Pages 缓存未刷新，会立即报错。

### 3.2 三保险方案

#### 保险 1：资源守护
- 确认 `.gitignore` 中不忽略 `opencc-full.js`、`*二维码*` 等关键资源。
- 在每次同步 `public/index.html` 到根目录和 `docs/` 时，同步 `opencc-full.js`（如果内容不同）。
- 在脚本加载处增加 `crossorigin` 与 `onerror` 回调，加载失败时自动尝试从根目录重新加载一次。

#### 保险 2：显式加载与重试
将 `<script src="opencc-full.js"></script>` 改为：

```html
<script>
window.__openccLoaded = false;
function loadOpenCC() {
  const s = document.createElement('script');
  s.src = 'opencc-full.js';
  s.onload = function() { window.__openccLoaded = true; };
  s.onerror = function() {
    setTimeout(function() {
      const r = document.createElement('script');
      r.src = 'opencc-full.js?t=' + Date.now();
      r.onload = function() { window.__openccLoaded = true; };
      document.head.appendChild(r);
    }, 500);
  };
  document.head.appendChild(s);
}
loadOpenCC();
</script>
```

#### 保险 3：点击时等待与降级提示
在 `toggleTraditionalChinese()` 与 `setTraditional()` 中：
- 若 `OpenCC` 未就绪，先显示 `showToast('正在初始化简繁转换…')`。
- 轮询最多 3 秒，若仍未就绪则提示 `showToast('简繁转换初始化失败，请刷新页面后重试')`。
- 避免直接抛出“简繁转换组件加载失败”。

### 3.3 代码改动位置
- `public/index.html`：修改 `opencc-full.js` 加载方式、增强 `setTraditional` / `toggleTraditionalChinese` 的容错。
- 同步到 `index.html`（根目录）和 `docs/index.html`。

## 4. 执行边界

- 不修改排盘算法、四柱计算、神星门排布。
- 不修改 PDF 导出逻辑。
- 不替换 `opencc-full.js` 为 CDN 版本，继续使用本地文件。
- 化合关系仅作用于 `showShengWang` 弹窗，不改变盘面上的显示。

## 5. 验证标准

### 5.1 六合化合关系
- 本地 `http://localhost:8090/` 打开排盘结果，点击外围 12 宫任意【灵/天/人/地盘】，弹窗中出现「化合关系」区块。
- 天干五合、地支六合名称与 CSV 一致。
- 中宫点击不显示六合区块或显示“—”。

### 5.2 简繁转换健壮性
- 清空缓存后访问线上页面，点击【简繁转换】可正常切换，不提示“加载失败”。
- 在 `opencc-full.js` 被模拟删除/404 时，能给出友好提示并在恢复后正常工作。
- 三处入口文件保持一致。
