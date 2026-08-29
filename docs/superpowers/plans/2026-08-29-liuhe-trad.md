# 六合化合关系 + 简繁转换健壮性修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在外围 12 宫的【灵/天/人/地盘】点击弹窗中增加六合化合关系展示；修复简繁转换在每次更新后容易加载失败的问题。

**Architecture:** 所有改动集中在 `public/index.html` 的现有弹窗与简繁转换逻辑中，新增数据常量和辅助函数，最后同步到根目录 `index.html` 与 `docs/index.html`。

**Tech Stack:** HTML5 / CSS3 / Vanilla JavaScript / OpenCC.js

---

## 文件结构

- **Modify** `public/index.html`：核心实现文件，包含排盘 UI、弹窗、简繁转换逻辑。
- **Sync to** `index.html`（根目录）和 `docs/index.html`：确保 GitHub Pages 部署一致。
- **Update** `work-flow.md`：记录本次修复与验证结果。

---

## Task 1: 添加六合化合关系数据常量

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: 在现有常量区域后追加天干五合与地支六合数据**

  在 `const PALACE_BRANCH = [...];` 之后（约 2456 行附近），追加：

  ```js
  // 天干五合：甲己 乙庚 丙辛 丁壬 戊癸
  const TIAN_GAN_WU_HE = {
    '甲': '己', '己': '甲',
    '乙': '庚', '庚': '乙',
    '丙': '辛', '辛': '丙',
    '丁': '壬', '壬': '丁',
    '戊': '癸', '癸': '戊'
  };
  const TIAN_GAN_WU_HE_NAME = {
    '甲': '甲己合土（中正之合）', '己': '甲己合土（中正之合）',
    '乙': '乙庚合金（仁义之合）', '庚': '乙庚合金（仁义之合）',
    '丙': '丙辛合水（威制之合）', '辛': '丙辛合水（威制之合）',
    '丁': '丁壬合木（淫慝之合）', '壬': '丁壬合木（淫慝之合）',
    '戊': '戊癸合火（无情之合）', '癸': '戊癸合火（无情之合）'
  };

  // 地支六合：子丑 寅亥 卯戌 辰酉 巳申 午未
  const DI_ZHI_LIU_HE = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午'
  };
  const DI_ZHI_LIU_HE_NAME = {
    '子': '子丑合土', '丑': '子丑合土',
    '寅': '寅亥合木', '亥': '寅亥合木',
    '卯': '卯戌合火', '戌': '卯戌合火',
    '辰': '辰酉合金', '酉': '辰酉合金',
    '巳': '巳申合水', '申': '巳申合水',
    '午': '午未合土', '未': '午未合土'
  };
  ```

- [ ] **Step 2: 验证常量无语法错误**

  在浏览器控制台执行：
  ```js
  Object.keys(TIAN_GAN_WU_HE).length === 10 && Object.keys(DI_ZHI_LIU_HE).length === 12
  ```
  Expected: `true`

---

## Task 2: 修改 `showShengWang` 弹窗，增加化合关系区块

**Files:**
- Modify: `public/index.html`

- [ ] **Step 3: 在 `showShengWang` 函数内组装弹窗 HTML 时插入六合关系**

  定位到 `showShengWang` 函数中 `const html = \`<div class="detail-modal ...">` 开始的位置。当前弹窗结构顺序为：状态解读卡 → 各宫之干 → 生旺死绝表。

  在“状态解读卡”区块之后、“各宫之干”区块之前，插入以下生成的 HTML（保留原有变量，新增 `liuheHtml`）：

  ```js
  const branch = (idx != null && idx >= 0 && idx < 13) ? PALACE_BRANCH[idx] : null;
  const liuheHtml = buildLiuHeHtml(stem, branch);
  ```

  然后在弹窗 HTML 字符串中，状态解读卡 `</div>` 结束后追加：

  ```html
  <div class="detail-block">
    <div class="detail-title">六合关系</div>
    <div class="liuhe-list">${liuheHtml}</div>
  </div>
  ```

- [ ] **Step 4: 新增 `buildLiuHeHtml` 辅助函数**

  在 `showShengWang` 函数之前（同一作用域内），添加：

  ```js
  function buildLiuHeHtml(gan, branch) {
    if (!gan) return '<div class="liuhe-row"><span>—</span></div>';
    let html = '';
    // 天干五合
    const heGan = TIAN_GAN_WU_HE[gan];
    if (heGan) {
      html += `<div class="liuhe-row"><span class="liuhe-label">天干五合</span><span class="liuhe-value">${gan} ↔ ${heGan}</span><span class="liuhe-desc">${TIAN_GAN_WU_HE_NAME[gan] || ''}</span></div>`;
    }
    // 地支六合
    if (branch) {
      const heZhi = DI_ZHI_LIU_HE[branch];
      if (heZhi) {
        html += `<div class="liuhe-row"><span class="liuhe-label">地支六合</span><span class="liuhe-value">${branch} ↔ ${heZhi}</span><span class="liuhe-desc">${DI_ZHI_LIU_HE_NAME[branch] || ''}</span></div>`;
      }
    } else {
      html += `<div class="liuhe-row"><span class="liuhe-label">地支六合</span><span class="liuhe-value">—</span></div>`;
    }
    return html;
  }
  ```

- [ ] **Step 5: 添加化合关系 CSS 样式**

  在 `<style>` 区域中查找 `.shengwang-table` 相关样式，在其后追加：

  ```css
  .liuhe-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .liuhe-row { display: flex; align-items: center; justify-content: flex-start; gap: 12px; font-size: 15px; color: #f5f0e8; }
  .liuhe-label { min-width: 70px; color: #d4af37; font-weight: 600; }
  .liuhe-value { min-width: 80px; font-weight: 700; letter-spacing: 2px; }
  .liuhe-desc { color: #b8b0a0; font-size: 13px; }
  ```

- [ ] **Step 6: 本地验证六合关系弹窗**

  操作：
  1. 启动本地服务 `node docs/server.js`（端口 8090）。
  2. 访问 `http://localhost:8090/`，输入测试时间生成排盘。
  3. 点击外围 12 宫任意宫的【灵盘 / 天盘 / 人盘 / 地盘】。
  4. 检查弹窗中是否出现「六合关系」区块，且天干五合、地支六合名称正确。

---

## Task 3: 修复简繁转换加载失败问题

**Files:**
- Modify: `public/index.html`

- [ ] **Step 7: 把 `opencc-full.js` 的静态 script 标签改为显式加载并带重试**

  在 `public/index.html` 中查找：
  ```html
  <script src="opencc-full.js"></script>
  ```

  替换为：
  ```html
  <script>
  (function() {
    window.__openccLoaded = false;
    function loadOpenCC(src) {
      var s = document.createElement('script');
      s.src = src || 'opencc-full.js';
      s.async = false;
      s.onload = function() { window.__openccLoaded = true; };
      s.onerror = function() {
        if (!window.__openccRetry) {
          window.__openccRetry = true;
          setTimeout(function() { loadOpenCC('opencc-full.js?t=' + Date.now()); }, 500);
        }
      };
      document.head.appendChild(s);
    }
    loadOpenCC();
  })();
  </script>
  ```

- [ ] **Step 8: 增强 `toggleTraditionalChinese` 与 `setTraditional` 的容错等待**

  在 `public/index.html` 中定位到 `function setTraditional(isTrad) {` 开头处。将其内部首行改为带等待：

  ```js
  function setTraditional(isTrad) {
    if (window.__openccSetting) return;
    window.__openccSetting = true;
    function doConvert() {
      window.__openccSetting = false;
      if (typeof OpenCC === 'undefined') {
        showToast('简繁转换组件尚未就绪，请刷新页面后重试');
        return;
      }
      if (typeof converter === 'undefined' || converter == null) {
        converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
      }
      isTraditional = isTrad;
      localStorage.setItem('qimen_traditional', isTrad ? '1' : '0');
      // 触发全页面转换
      applyI18n();
      // 同步更新“简繁转换”按钮文本
      var label = document.querySelector('#profile-quick-actions .qa-label');
      if (label) label.textContent = isTrad ? '簡繁轉換' : '简繁转换';
      showToast(isTrad ? '已切换为繁体' : '已切换为简体');
    }
    if (typeof OpenCC === 'undefined' && !window.__openccLoaded) {
      showToast('正在初始化简繁转换…');
      var waited = 0;
      var timer = setInterval(function() {
        waited += 200;
        if (typeof OpenCC !== 'undefined' || waited >= 3000) {
          clearInterval(timer);
          doConvert();
        }
      }, 200);
      return;
    }
    doConvert();
  }
  ```

  注意：保留原 `converter`、`isTraditional`、`applyI18n()` 的既有调用方式；如果原函数结构不同，只做首行插入，不破坏后续 DOM 遍历逻辑。

- [ ] **Step 9: 确保 `applyI18n` 转换弹窗内的化合关系文本**

  在 `applyI18n` 函数中，确认其会遍历 `#root` 或 `body` 下所有文本节点。由于弹窗是动态插入到 `body` 的，通常已被覆盖。若原 `applyI18n` 仅转换 `#app` 等固定容器，则改为：

  ```js
  function applyI18n() {
    if (!isTraditional) {
      restoreOriginalText();
      return;
    }
    if (typeof OpenCC === 'undefined') return;
    if (!converter) converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    // 转换 body 下所有可见文本节点
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      if (!node.parentNode || node.parentNode.closest && node.parentNode.closest('script,style')) continue;
      if (!node.__origText) node.__origText = node.textContent;
      node.textContent = converter(node.__origText);
    }
  }
  ```

  如果 `applyI18n` 已有 `document.createTreeWalker(document.body, ...)` 则跳过此步。

- [ ] **Step 10: 本地验证简繁转换**

  操作：
  1. 清空浏览器缓存，访问 `http://localhost:8090/`。
  2. 进入【我的】页面，点击【简繁转换】。
  3. 期望：先提示“正在初始化简繁转换…”，随后“已切换为繁体”，页面出现繁体文本。
  4. 再次点击切回简体。
  5. 打开排盘结果，点击【天盘】打开六合弹窗，确认弹窗内“天干五合”“地支六合”等文本也随简繁切换正确转换。

---

## Task 4: 同步三处入口文件并部署

**Files:**
- Sync: `public/index.html` → `index.html`
- Sync: `public/index.html` → `docs/index.html`
- Modify: `work-flow.md`

- [ ] **Step 11: 同步 `public/index.html` 到根目录与 `docs/`**

  命令：
  ```powershell
  Copy-Item -Path public/index.html -Destination index.html -Force
  Copy-Item -Path public/index.html -Destination docs/index.html -Force
  ```

- [ ] **Step 12: 确保 `opencc-full.js` 三处一致并提交**

  命令：
  ```powershell
  Copy-Item -Path opencc-full.js -Destination public/opencc-full.js -Force
  Copy-Item -Path opencc-full.js -Destination docs/opencc-full.js -Force
  git add -f opencc-full.js public/opencc-full.js docs/opencc-full.js public/index.html index.html docs/index.html
  git commit -m "feat(pan): 外围12宫*盘增加六合化合关系；fix(i18n): 简繁转换加载兜底与重试"
  ```

- [ ] **Step 13: 推送并验证 GitHub Pages**

  命令：
  ```bash
  git push origin master
  ```

  操作：
  1. 等待 2–3 分钟后访问 `https://142857110823.github.io/app-for-father/`。
  2. 进行排盘，点击外围宫位的【地盘】，检查弹窗中的“六合关系”。
  3. 点击【我的】→【简繁转换】，检查是否正常切换。

- [ ] **Step 14: 更新 `work-flow.md`**

  追加条目：
  ```markdown
  ### 2026-08-29 外围十二宫六合关系 + 简繁转换健壮性修复
  **【时间】** 2026-08-29
  **【事件】** 用户要求在【灵/天/人/地盘】点击弹窗中增加六合化合关系，并修复简繁转换更新后偶发加载失败。
  **【问题来源】** 用户消息。
  **【执行方向】**
  1. 依据 `F:\1\夫\六合\化合关系表.csv` 在 `public/index.html` 中新增天干五合、地支六合数据与展示函数。
  2. 在 `showShengWang` 弹窗中插入「六合关系」区块，仅作用于外围 12 宫。
  3. 将 `opencc-full.js` 改为显式加载并带 500ms 重试；增强 `setTraditional` 的等待与降级提示。
  4. 同步三处入口文件并推送 GitHub Pages。
  **【执行边界】**
  - 不修改排盘算法。
  - 不替换 OpenCC 为 CDN。
  **【执行结果】**
  - 线上弹窗已增加六合关系。
  - 简繁转换在清空缓存后首次点击可正常初始化并切换。
  **【相关文档】** 2026-08-29-liuhe-trad-design.md、2026-08-29-liuhe-trad.md、work-flow.md
  ```

---

## Self-Review Checklist

1. **Spec coverage**
   - 天干五合数据：Task 1 ✓
   - 地支六合数据：Task 1 ✓
   - 外围 12 宫点击*盘触发：Task 2（在现有 `showShengWang` 中）✓
   - 弹窗中六合关系区块：Task 2 ✓
   - 简繁转换加载兜底：Task 3 ✓
   - 三处入口同步：Task 4 ✓
2. **Placeholder scan**：无 TBD/TODO/实现 later。
3. **Type consistency**
   - `TIAN_GAN_WU_HE` / `DI_ZHI_LIU_HE` 为字符串映射字典，与 `buildLiuHeHtml` 用法一致。
   - `idx` 为整数，与 `PALACE_BRANCH[idx]` 用法一致。
