import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const ROOT = "F:/1/夫/六合";
const OUTPUT_DIR = path.join(ROOT, "输出");
const EVIDENCE_DIR = path.join(ROOT, "分析", "统计结果", "工作簿渲染证据");
const VERIFY_PATH = path.join(ROOT, "分析", "统计结果", "工作簿验证.json");
const RESULT_DIR = path.join(ROOT, "分析", "统计结果");

const colors = {
  navy: "#17324D",
  blue: "#2E5D7B",
  paleBlue: "#EAF2F7",
  red: "#9C2F2F",
  paleRed: "#FBEAEA",
  gold: "#B58932",
  paleGold: "#F8F1DF",
  ink: "#1F2933",
  gray: "#66727D",
  paleGray: "#F3F5F7",
  line: "#D7DEE3",
  white: "#FFFFFF",
};

const sheetNames = [
  "README",
  "数据字典",
  "原始开奖",
  "来源登记",
  "质量检查",
  "描述统计",
  "随机性检验",
  "时间回测",
  "玄学特征",
  "结论与限制",
];

const products = [
  {
    key: "taiwan",
    region: "台湾",
    productCn: "台湾大乐透",
    productEn: "Taiwan Lotto 6/49",
    rule: "官方大乐透 6/49",
    ruleStatus: "官方年度 ZIP 与逐期解析审计已完成；2006 年无官方年度资源，保留缺口",
    expectedCount: 6,
    rawCsv: path.join(ROOT, "台湾", "原始", "台湾大乐透_开奖历史.csv"),
    sourceCsv: path.join(ROOT, "台湾", "来源", "台湾大乐透_来源登记.csv"),
    collectionReport: path.join(ROOT, "台湾", "报告", "台湾大乐透_采集报告.md"),
    output: path.join(OUTPUT_DIR, "台湾大乐透_2006-2026_历史与统计分析.xlsx"),
    sourceCount: 26,
    missing: "2006-01-01 至 2006-12-31（官方年度资源缺口）；2026-08-01 至 2026-08-31 不在本研究范围内",
    sourceSummary: "26 条官方发行方/政府开放数据来源已登记；2007-2026 年度 ZIP 已保存并解析，2006 年无官方年度资源。",
    complete: true,
    analysis: {
      descriptive: path.join(RESULT_DIR, "台湾_描述统计.json"),
      randomness: path.join(RESULT_DIR, "台湾_随机性检验.json"),
      backtest: path.join(RESULT_DIR, "台湾_时间回测.json"),
      esoteric: path.join(RESULT_DIR, "台湾_玄学特征.json"),
      featureHyperspace: path.join(RESULT_DIR, "台湾_第一轮特征拓扑.json"),
      modelFactory: path.join(RESULT_DIR, "台湾_第一轮模型回测.json"),
      loop2Summary: path.join(RESULT_DIR, "台湾_第二轮特征修剪与集成.json"),
    },
  },
  {
    key: "macau",
    region: "澳门",
    productCn: "澳门白鸽票",
    productEn: "Macau White Pigeon",
    rule: "任务研究口径 80/20",
    ruleStatus: "官方法规已确认 80/20；逐期开奖历史数据仍未取得",
    expectedCount: 20,
    rawCsv: path.join(ROOT, "澳门", "原始", "澳门白鸽票_开奖历史.csv"),
    sourceCsv: path.join(ROOT, "澳门", "来源", "澳门白鸽票_来源登记.csv"),
    collectionReport: path.join(ROOT, "澳门", "报告", "澳门白鸽票_采集报告.md"),
    output: path.join(OUTPUT_DIR, "澳门白鸽票_2006-2026_历史与统计分析.xlsx"),
    sourceCount: 10,
    missing: "2006-01-01 至 2026-07-31 全部逐期开奖记录；2026-08-01 至 2026-08-31 不在本研究范围内",
    sourceSummary: "10 条官方监管、法规、档案、公报和政府开放数据来源已登记；已核验 37 个深层页面及开放数据目录 API，未发现逐期开奖历史表。",
    complete: false,
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v !== ""));
}

function applyBaseSheet(sheet) {
  sheet.showGridLines = false;
  sheet.getRange("A1:O80").format.font = {
    name: "Microsoft YaHei",
    size: 10,
    color: colors.ink,
  };
  sheet.getRange("A1:O80").format.verticalAlignment = "center";
}

function titleBand(sheet, title, subtitle) {
  sheet.mergeCells("A1:H2");
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1:H2").format = {
    fill: colors.navy,
    font: { name: "Microsoft YaHei", size: 18, bold: true, color: colors.white },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.mergeCells("A3:H3");
  sheet.getRange("A3").values = [[subtitle]];
  sheet.getRange("A3:H3").format = {
    fill: colors.paleBlue,
    font: { name: "Microsoft YaHei", size: 10, color: colors.blue },
    wrapText: true,
  };
  sheet.getRange("A1:H3").format.borders = {
    preset: "outside",
    style: "thin",
    color: colors.line,
  };
  sheet.getRange("A1:H1").format.rowHeight = 28;
  sheet.getRange("A2:H2").format.rowHeight = 28;
  sheet.getRange("A3:H3").format.rowHeight = 30;
}

function statusBand(sheet, text) {
  sheet.mergeCells("A5:H6");
  sheet.getRange("A5").values = [[text]];
  sheet.getRange("A5:H6").format = {
    fill: colors.paleRed,
    font: { name: "Microsoft YaHei", size: 11, bold: true, color: colors.red },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "medium", color: colors.red },
  };
  sheet.getRange("A5:H6").format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: colors.blue,
    font: { name: "Microsoft YaHei", size: 10, bold: true, color: colors.white },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: colors.line },
  };
}

function styleBody(range) {
  range.format = {
    fill: colors.white,
    font: { name: "Microsoft YaHei", size: 10, color: colors.ink },
    wrapText: true,
    verticalAlignment: "top",
    borders: { preset: "all", style: "thin", color: colors.line },
  };
}

function formatNumber(value, digits = 4) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : value;
}

function splitPipe(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

async function loadJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function deriveTaiwanChecks(rawRows) {
  const header = rawRows[0] ?? [];
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  const data = rawRows.slice(1);
  const periods = data.map((row) => row[indexes.draw_id]).filter(Boolean);
  const dates = data.map((row) => row[indexes.draw_date]).filter(Boolean).sort();
  const invalidCounts = data.filter((row) => {
    const numbers = splitPipe(row[indexes.numbers]);
    return numbers.length !== 6
      || numbers.some((number) => number < 1 || number > 49)
      || new Set(numbers).size !== numbers.length
      || row[indexes.record_status] !== "verified";
  }).length;
  return {
    header,
    data,
    indexes,
    recordCount: data.length,
    verifiedCount: data.filter((row) => row[indexes.record_status] === "verified").length,
    duplicatePeriods: periods.length - new Set(periods).size,
    invalidCounts,
    dateMin: dates[0] ?? "",
    dateMax: dates.at(-1) ?? "",
  };
}

function derivedRowsFromJson(stats) {
  const rows = [["项目", "数值", "口径", "说明", "", ""]];
  rows.push(["记录数", stats.record_count, "逐期 verified 记录", "2006 年保持官方资料缺口", "", ""]);
  rows.push(["日期范围", `${stats.date_min} 至 ${stats.date_max}`, "官方年度 ZIP 解析结果", "2026 年数据截至 2026-07-31", "", ""]);
  rows.push(["和值均值", formatNumber(stats.sum.mean), "每期 6 个普通号码之和", "历史样本描述", "", ""]);
  rows.push(["和值标准差", formatNumber(stats.sum.std), "样本标准差", "历史样本描述", "", ""]);
  rows.push(["和值最小值", stats.sum.min, "历史最小和值", "", "", ""]);
  rows.push(["和值最大值", stats.sum.max, "历史最大和值", "", "", ""]);
  rows.push(["和值中位数", stats.sum.median, "历史中位数", "", "", ""]);
  rows.push(["单号均匀性卡方", formatNumber(stats.chi_square_uniformity.statistic), "df=48", "p 值不能转换为未来概率", "", ""]);
  rows.push(["卡方近似 p 值", formatNumber(stats.chi_square_uniformity.p_value_approx, 6), "均匀分布基线", "仅描述样本偏离", "", ""]);
  rows.push(["2006 缺口", "是", "官方年度索引从 2007 年开始", "禁止使用非官方数据补齐", "", ""]);
  rows.push(["公布时间", "无法确认", "官方年度 CSV 未提供具体公布时间", "published_time 保持为空", "", ""]);
  return rows;
}

function numberFrequencyRows(stats) {
  const rows = [["号码", "出现次数", "期均频率", "与期望差", "", ""]];
  for (let number = 1; number <= 49; number += 1) {
    const count = stats.number_frequency[String(number)] ?? 0;
    rows.push([
      number,
      count,
      formatNumber(count / stats.record_count, 6),
      formatNumber(count - stats.number_frequency_expected_per_number, 4),
      "",
      "",
    ]);
  }
  return rows;
}

function distributionRows(title, distribution, label) {
  return [
    [title, "次数", "比例", "定义", "", ""],
    ...Object.entries(distribution).map(([key, value]) => [
      key,
      value,
      formatNumber(value / Object.values(distribution).reduce((sum, item) => sum + item, 0), 6),
      label,
      "",
      "",
    ]),
  ];
}

function writeSection(sheet, startRow, title, rows) {
  const endCol = 6;
  sheet.mergeCells(`A${startRow}:F${startRow}`);
  sheet.getRange(`A${startRow}`).values = [[title]];
  sheet.getRange(`A${startRow}:F${startRow}`).format = {
    fill: colors.paleGold,
    font: { name: "Microsoft YaHei", size: 11, bold: true, color: colors.gold },
    borders: { preset: "outside", style: "thin", color: colors.gold },
  };
  if (rows.length) {
    const endRow = startRow + rows.length;
    const normalizedRows = rows.map((row) => [
      ...row,
      ...Array(Math.max(0, 6 - row.length)).fill(""),
    ].slice(0, 6));
    sheet.getRange(`A${startRow + 1}:F${endRow}`).values = normalizedRows;
    styleBody(sheet.getRange(`A${startRow + 1}:F${endRow}`));
    sheet.getRange(`A${startRow + 1}:A${endRow}`).format.font = {
      name: "Microsoft YaHei",
      size: 10,
      bold: true,
      color: colors.ink,
    };
  }
  return startRow + rows.length + 2;
}

function setCommonWidths(sheet) {
  sheet.getRange("A:A").format.columnWidth = 20;
  sheet.getRange("B:B").format.columnWidth = 22;
  sheet.getRange("C:C").format.columnWidth = 22;
  sheet.getRange("D:D").format.columnWidth = 24;
  sheet.getRange("E:E").format.columnWidth = 24;
  sheet.getRange("F:F").format.columnWidth = 34;
  sheet.getRange("G:G").format.columnWidth = 22;
  sheet.getRange("H:H").format.columnWidth = 34;
}

function makeReadme(sheet, p) {
  titleBand(
    sheet,
    `${p.productCn}历史与统计分析`,
    `${p.complete ? "统计分析工作簿" : "阻塞审计工作簿"} | 冻结研究范围：2006-01-01 至 2026-07-31`,
  );
  statusBand(
    sheet,
    p.complete
      ? `COMPLETE：${p.dateMin} 至 ${p.dateMax} 已取得 ${p.recordCount} 条官方年度 ZIP 解析记录；${p.missing}。统计结果仅描述历史样本，不构成预测或投注结论。`
      : "BLOCKED：当前 verified 逐期开奖记录为 0。此工作簿只记录来源、数据结构、质量缺口与分析预案，不包含任何预测或投注结论。",
  );
  sheet.getRange("A8:B15").values = [
    ["项目", "当前值"],
    ["地区", p.region],
    ["产品", p.productEn],
    ["规则口径", p.rule],
    ["规则核验状态", p.ruleStatus],
    ["已核验逐期记录数", null],
    ["来源登记数", null],
    ["缺失范围", p.missing],
  ];
  styleHeader(sheet.getRange("A8:B8"));
  styleBody(sheet.getRange("A9:B15"));
  sheet.getRange("B13").formulas = [["=COUNTA('原始开奖'!A8:A10000)"]];
  sheet.getRange("B14").formulas = [["=COUNTA('来源登记'!A8:A100)"]];
  sheet.getRange("B13:B14").format.numberFormat = "0";
  sheet.getRange("D8:H15").values = [
    ["使用说明", null, null, null, null],
    ["1", "先看“来源登记”和“质量检查”。", null, null, null],
    ["2", p.complete ? "“原始开奖”包含已核验官方逐期记录。" : "“原始开奖”只有表头，表示没有可审计逐期记录。", null, null, null],
    ["3", p.complete ? "统计、回测和玄学特征页展示锁定方法下的历史结果。" : "统计、回测和玄学特征页均为方法预案，不含计算结果。", null, null, null],
    ["4", "不得将本工作簿用于下一期号码、投注技巧或收益承诺。", null, null, null],
    ["5", p.complete ? `${p.missing} 不使用来源不明数据补齐。` : "取得官方逐期数据后，先回到采集智能体补全原始 CSV。", null, null, null],
    ["6", "主分析仅允许使用 record_status=verified 的记录。", null, null, null],
    ["7", p.complete ? "当前结论：未发现可复现、可泛化的预测证据。" : "当前结论：无法开展规律检验。", null, null, null],
  ];
  sheet.mergeCells("D8:H8");
  styleHeader(sheet.getRange("D8:H8"));
  for (let r = 9; r <= 15; r += 1) sheet.mergeCells(`E${r}:H${r}`);
  styleBody(sheet.getRange("D9:H15"));
  sheet.freezePanes.freezeRows(7);
  setCommonWidths(sheet);
}

function makeDictionary(sheet, p) {
  titleBand(sheet, "数据字典", `${p.productCn}原始开奖与来源字段定义`);
  statusBand(sheet, `字段已锁定；当前逐期记录 ${p.recordCount ?? 0} 条，新增记录必须保留官方来源映射。`);
  const rawFields = p.key === "taiwan"
    ? [
        ["jurisdiction", "文本", "固定 Taiwan", "司法辖区"],
        ["product", "文本", "固定 Taiwan Lotto 6/49", "产品英文标识"],
        ["draw_id", "文本", "仅使用官方期号", "开奖标识"],
        ["draw_date", "日期", "yyyy-mm-dd", "开奖日期"],
        ["published_time", "时间/空", "官方未给出则留空", "公布时间"],
        ["numbers", "文本", "按官方顺序，以 | 分隔", "普通号码"],
        ["numbers_sorted", "文本", "升序，以 | 分隔", "统计辅助字段"],
        ["number_count_expected", "整数", String(p.expectedCount), "预期号码数量"],
        ["special_number", "整数", "1-49；官方特别号", "特别号码"],
        ["sales_amount", "整数/空", "官方提供则填写", "销售总额"],
        ["sales_bets", "整数/空", "官方提供则填写", "销售注数"],
        ["total_prize", "整数/空", "官方提供则填写", "总奖金"],
        ["source_id", "文本", "必须映射来源登记", "来源编号"],
        ["source_url", "文本", "原始 URL", "来源地址"],
        ["retrieved_at", "日期时间", "Asia/Shanghai ISO 8601", "抓取时间"],
        ["record_status", "枚举", "verified/partial/missing/conflict", "记录状态"],
        ["notes", "文本", "异常、缺失和冲突说明", "备注"],
      ]
    : [
        ["jurisdiction", "文本", "固定 Macau", "司法辖区"],
        ["product", "文本", "固定 Macau White Pigeon", "产品英文标识"],
        ["draw_id", "文本", "仅使用官方标识", "开奖标识"],
        ["draw_date", "日期", "yyyy-mm-dd", "开奖日期"],
        ["draw_time", "时间/空", "官方未给出则留空", "开奖时间"],
        ["published_time", "时间/空", "官方未给出则留空", "公布时间"],
        ["numbers", "文本", "按官方顺序，以 | 分隔", "开奖号码"],
        ["numbers_sorted", "文本", "升序，以 | 分隔", "统计辅助字段"],
        ["number_count_expected", "整数/空", "规则确认后填写", "预期号码数量"],
        ["draw_count_per_day", "整数/空", "官方可确认时填写", "每日开奖次数"],
        ["source_id", "文本", "必须映射来源登记", "来源编号"],
        ["source_url", "文本", "原始 URL", "来源地址"],
        ["retrieved_at", "日期时间", "Asia/Shanghai ISO 8601", "抓取时间"],
        ["record_status", "枚举", "verified/partial/missing/conflict", "记录状态"],
        ["notes", "文本", "规则、异常、缺失和冲突说明", "备注"],
      ];
  sheet.getRange(`A8:D${8 + rawFields.length}`).values = [
    ["字段", "类型", "规则", "说明"],
    ...rawFields,
  ];
  styleHeader(sheet.getRange("A8:D8"));
  styleBody(sheet.getRange(`A9:D${8 + rawFields.length}`));
  sheet.getRange("A:A").format.columnWidth = 25;
  sheet.getRange("B:B").format.columnWidth = 18;
  sheet.getRange("C:C").format.columnWidth = 34;
  sheet.getRange("D:D").format.columnWidth = 34;
  sheet.freezePanes.freezeRows(8);
}

function makeCsvSheet(sheet, p, rows, kind) {
  const title = kind === "raw" ? "原始开奖" : "来源登记";
  const rowCount = Math.max(0, rows.length - 1);
  const subtitle = kind === "raw"
    ? `${p.productCn}逐期数据 | 当前记录数 ${rowCount}`
    : `${p.productCn}来源审计 | ${p.sourceSummary}`;
  titleBand(sheet, title, subtitle);
  statusBand(
    sheet,
    kind === "raw"
      ? (p.complete
        ? "COMPLETE：以下记录来自已保存的官方年度 ZIP，并已通过号码数量、范围、期内重复、期号重复和来源映射检查。公布时间无法从官方年度 CSV 确认，保持为空。"
        : "BLOCKED：没有可核验逐期开奖记录。仅保留字段表头，不得将空表解释为开奖规律。")
      : "来源登记仅证明入口、监管或档案状态；未提供逐期号码的来源不得被解释为开奖数据。",
  );
  const maxCols = Math.max(...rows.map((r) => r.length));
  const header = rows[0] ?? [];
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  const dateColumns = kind === "source"
    ? ["accessed_at"]
    : ["draw_date", "retrieved_at"];
  const integerColumns = kind === "source"
    ? []
    : ["number_count_expected", "special_number", "sales_amount", "sales_bets", "total_prize"];
  const normalized = rows.map((r, rowIndex) => {
    const values = [...r, ...Array(maxCols - r.length).fill("")];
    if (rowIndex > 0) {
      for (const field of dateColumns) {
        const index = indexes[field];
        if (index !== undefined && values[index]) values[index] = new Date(values[index]);
      }
      for (const field of integerColumns) {
        const index = indexes[field];
        if (index !== undefined && values[index] !== "") {
          const number = Number(values[index]);
          values[index] = Number.isFinite(number) ? number : values[index];
        }
      }
    }
    return values;
  });
  const endCol = columnName(maxCols);
  const endRow = 6 + normalized.length;
  sheet.getRange(`A7:${endCol}${endRow}`).values = normalized;
  styleHeader(sheet.getRange(`A7:${endCol}7`));
  if (normalized.length > 1) styleBody(sheet.getRange(`A8:${endCol}${endRow}`));
  for (let c = 0; c < maxCols; c += 1) {
    const col = columnName(c + 1);
    let width = 19;
    if (kind === "source" && ["E", "F", "K", "M"].includes(col)) width = 32;
    if (kind === "source" && col === "E") width = 52;
    if (kind === "raw" && ["F", "G", "J", "M", "N", "O", "Q"].includes(col)) width = 34;
    sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  }
  if (kind === "source") {
    sheet.getRange("F:F").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
  } else if (p.key === "taiwan") {
    sheet.getRange("D:D").format.numberFormat = "yyyy-mm-dd";
    sheet.getRange("O:O").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
  } else {
    sheet.getRange("D:D").format.numberFormat = "yyyy-mm-dd";
    sheet.getRange("M:M").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
  }
  sheet.freezePanes.freezeRows(7);
}

function columnName(n) {
  let name = "";
  let value = n;
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function makeQuality(sheet, p) {
  titleBand(sheet, "质量检查", `${p.productCn}数据完整性、来源和可分析性审计`);
  const checks = p.complete
    ? [
        ["采集状态", "COMPLETE", "台湾官方年度解析审计 JSON", "保留 2006 年官方资源缺口；2026 年 8 月为研究范围外"],
        ["逐期记录数", p.recordCount, "原始开奖数据行数", `已取得 ${p.recordCount} 条`],
        ["verified 记录数", p.verifiedCount, "record_status=verified", "主分析全部使用 verified"],
        ["来源登记数", p.sourceCount, "来源登记数据行数", `${p.sourceCount} 条登记来源`],
        ["verified 来源数", p.verifiedSourceCount, "来源登记 status=verified", `${p.verifiedSourceCount} 条来源实际支撑逐期记录`],
        ["日期覆盖", `${p.dateMin} 至 ${p.dateMax}`, "原始开奖 draw_date", "按已取得官方年度文件实际边界"],
        ["号码数量检查", p.invalidCounts === 0 ? "通过" : "失败", "每期 6 个，范围 1-49，期内无重复", `异常记录 ${p.invalidCounts} 条`],
        ["期号重复检查", p.duplicatePeriods === 0 ? "通过" : "失败", "draw_id 唯一性", `重复期号 ${p.duplicatePeriods} 条`],
        ["公布时间", "无法确认", "官方年度 CSV 未提供", "published_time 保持为空"],
        ["数据缺口", "保留", p.missing, "禁止补造"],
      ]
    : [
        ["采集状态", "BLOCKED", "采集报告", "等待官方逐期数据"],
        ["逐期记录数", null, "原始开奖 A8:A10000", "必须大于 0 才能分析"],
        ["verified 记录数", 0, "当前无数据行", "主分析只使用 verified"],
        ["来源登记数", null, "来源登记 A8:A100", "仅表示来源入口数量"],
        ["完整缺失区间", p.missing, "采集报告", "不补造"],
        ["号码数量检查", "不适用", "record_count=0", "取得数据后执行"],
        ["号码范围检查", "不适用", "record_count=0", "取得数据后执行"],
        ["期内重复检查", "不适用", "record_count=0", "取得数据后执行"],
        ["期号连续性检查", "不适用", "record_count=0", "取得数据后执行"],
        ["号码级模型", "未生成", "status=not_generated；reason=no_verified_draw_level_data", "number_level_models=[]"],
      ];
  statusBand(
    sheet,
    p.complete
      ? `结论：COMPLETE。${p.recordCount} 条官方年度 ZIP 解析记录可进入描述统计和严格时间回测；${p.missing} 已显式保留。`
      : "结论：BLOCKED。记录数为 0，无法执行号码级、期号级或时间序列级检验。",
  );
  sheet.getRange(`A8:D${8 + checks.length}`).values = [
    ["检查项", "结果", "证据/计算", "处理"],
    ...checks,
  ];
  styleHeader(sheet.getRange("A8:D8"));
  styleBody(sheet.getRange(`A9:D${8 + checks.length}`));
  if (!p.complete) {
    sheet.getRange("B10").formulas = [["=COUNTA('原始开奖'!A8:A10000)"]];
    sheet.getRange("B12").formulas = [["=COUNTA('来源登记'!A8:A100)"]];
    sheet.getRange("B10:B12").format.numberFormat = "0";
  }
  sheet.getRange("A:A").format.columnWidth = 26;
  sheet.getRange("B:B").format.columnWidth = 28;
  sheet.getRange("C:C").format.columnWidth = 34;
  sheet.getRange("D:D").format.columnWidth = 34;
  sheet.freezePanes.freezeRows(8);
}

function makeMethodSheet(sheet, p, kind) {
  if (p.complete) {
    makeTaiwanMethodSheet(sheet, p, kind);
    return;
  }
  const configs = {
    "描述统计": {
      subtitle: "计划方法与启用条件",
      rows: [
        ["当前状态", "不可计算", "原因", "verified 逐期记录数为 0", "", ""],
        ["计划指标", "单号频数、相对频率、置信区间", "启用条件", "完成号码数量和范围校验", "", ""],
        ["计划指标", "和值、奇偶、大小、尾数、连号", "启用条件", "原始号码可解析且规则分段完成", "", ""],
        ["计划指标", "遗漏间隔、相邻期交集", "启用条件", "期号和日期顺序可确认", "", ""],
        ["禁止项", "不显示虚构频数或图表", "结论", "等待官方逐期数据", "", ""],
      ],
    },
    "随机性检验": {
      subtitle: "检验预案与随机基线",
      rows: [
        ["当前状态", "不可计算", "原因", "样本量为 0", "", ""],
        ["计划检验", "卡方均匀性检验", "随机基线", "按产品规则等概率抽样", "", ""],
        ["计划检验", "游程检验", "随机基线", "置换或蒙特卡洛模拟", "", ""],
        ["计划检验", "自相关/置换检验", "报告要求", "效应量、置信区间、多重检验校正", "", ""],
        ["禁止项", "不以 p 值或样本内偏差生成投注结论", "结论", "等待 verified 数据", "", ""],
      ],
    },
    "时间回测": {
      subtitle: "样本外验证预案",
      rows: [
        ["当前状态", "不可计算", "原因", "没有按日期排序的逐期样本", "", ""],
        ["计划切分", "早期训练区", "原则", "严格按时间顺序", "", ""],
        ["计划切分", "中期验证区", "原则", "只用于模型/特征选择", "", ""],
        ["计划切分", "后期最终留出区", "原则", "最终评估前不得查看", "", ""],
        ["计划指标", "Brier、Log Loss、Top-k、校准、MAE、RMSE、样本外 R²", "当前结果", "均不可计算", "", ""],
      ],
    },
    "玄学特征": {
      subtitle: "传统术数候选变量预案",
      rows: [
        ["当前状态", "不可计算", "原因", "没有 verified 逐期日期、时间和号码", "", ""],
        ["本地资料", "化合关系表.csv", "用途", "天干五合、地支六合候选编码", "", ""],
        ["本地资料", "化合对应表.xls", "用途", "待读取格式后建立映射", "", ""],
        ["本地资料", "十二地支宫.docx", "用途", "待提取规则后建立候选特征", "", ""],
        ["允许扩展", "农历、节气、干支、九宫、八卦、五行、方位", "约束", "先锁定编码，再做时间留出验证", "", ""],
        ["结论边界", "只报告统计关联", "禁止项", "不得写成确定性规律或投注建议", "", ""],
      ],
    },
  };
  const config = configs[kind];
  titleBand(sheet, kind, `${p.productCn} | ${config.subtitle}`);
  statusBand(sheet, "BLOCKED：下列内容是预注册方法，不是计算结果。没有 verified 数据时不得填写任何数值结论。");
  const rows = [["项目", "内容", "条件/口径", "说明", "", ""], ...config.rows];
  sheet.getRange(`A8:F${7 + rows.length}`).values = rows;
  styleHeader(sheet.getRange("A8:F8"));
  styleBody(sheet.getRange(`A9:F${7 + rows.length}`));
  sheet.getRange("A:A").format.columnWidth = 23;
  sheet.getRange("B:B").format.columnWidth = 38;
  sheet.getRange("C:C").format.columnWidth = 25;
  sheet.getRange("D:D").format.columnWidth = 45;
  sheet.getRange("E:F").format.columnWidth = 4;
  sheet.freezePanes.freezeRows(8);
}

function makeTaiwanMethodSheet(sheet, p, kind) {
  const stats = p.stats.descriptive;
  const randomness = p.stats.randomness;
  const backtest = p.stats.backtest;
  const esoteric = p.stats.esoteric;
  titleBand(sheet, kind, `${p.productCn} | 锁定方法下的历史样本结果`);
  statusBand(
    sheet,
    "COMPLETE：以下为历史样本统计或严格时间留出回测结果；不构成下一期预测、投注建议或确定性规律。",
  );
  let row = 8;
  if (kind === "描述统计") {
    row = writeSection(sheet, row, "核心描述统计", derivedRowsFromJson(stats));
    row = writeSection(sheet, row, "号码频数（1-49）", numberFrequencyRows(stats));
    row = writeSection(sheet, row, "和值结构", [
      ["指标", "数值", "口径", "说明", "", ""],
      ["均值", formatNumber(stats.sum.mean), "每期 6 个普通号码之和", "历史样本均值", "", ""],
      ["标准差", formatNumber(stats.sum.std), "样本标准差", "历史样本离散程度", "", ""],
      ["中位数", stats.sum.median, "每期 6 个普通号码之和", "历史样本中位数", "", ""],
      ["最小值", stats.sum.min, "历史最小和值", "", "", ""],
      ["最大值", stats.sum.max, "历史最大和值", "", "", ""],
    ]);
    row = writeSection(sheet, row, "奇数个数分布", distributionRows("奇数个数", stats.odd_count_distribution, "每期 6 个号码中奇数的个数"));
    row = writeSection(sheet, row, "连号对数分布", distributionRows("连号对数", stats.consecutive_pairs_distribution, "升序号码中相邻差为 1 的相邻对数"));
    row = writeSection(sheet, row, "年度期数", [
      ["年份", "期数", "比例", "说明", "", ""],
      ...Object.entries(stats.year_counts).map(([year, count]) => [
        year,
        count,
        formatNumber(count / stats.record_count, 6),
        year === "2026" ? "年度数据截至 2026-07-31" : "官方年度 ZIP 解析期数",
        "",
        "",
      ]),
    ]);
    row = writeSection(sheet, row, "月份期数", [
      ["月份", "期数", "比例", "说明", "", ""],
      ...Object.entries(stats.month_counts).map(([month, count]) => [
        month,
        count,
        formatNumber(count / stats.record_count, 6),
        "历史样本月份分布，不等于开奖概率",
        "",
        "",
      ]),
    ]);
    const stability = stats.annual_frequency_stability;
    row = writeSection(sheet, row, "跨年度频数稳定性", [
      ["指标", "数值", "样本范围", "解释边界", "", ""],
      ["年度频数两两相关均值", formatNumber(stability.pairwise_frequency_correlation.mean, 6), `${stability.pairwise_frequency_correlation.pairs} 个年度对`, "接近 0，年度频数结构不稳定", "", ""],
      ["年度频数两两相关中位数", formatNumber(stability.pairwise_frequency_correlation.median, 6), "2007-2026", "仅描述历史结构", "", ""],
      ["相邻年度 Top-6 平均交集", formatNumber(stability.adjacent_year_top6_overlap.mean, 4), `${stability.adjacent_year_top6_overlap.pairs} 个相邻年度对`, "不是未来入选概率", "", ""],
      ["相邻年度 Top-6 交集范围", `${stability.adjacent_year_top6_overlap.min}-${stability.adjacent_year_top6_overlap.max}`, "每对年度最多 6", "用于观察稳定程度", "", ""],
    ]);
    row = writeSection(sheet, row, "号码进入年度 Top-6 次数", [
      ["号码", "年度 Top-6 次数", "占 20 年比例", "说明", "", ""],
      ...Object.entries(stability.top6_inclusion_count).map(([number, count]) => [
        number,
        count,
        formatNumber(count / stability.years.length, 4),
        "历史频数排名描述，不是预测概率",
        "",
        "",
      ]),
    ]);
  } else if (kind === "随机性检验") {
    row = writeSection(sheet, row, "均匀性检验", [
      ["卡方统计量", formatNumber(randomness.uniformity.statistic), "df=48", "号码边际频数与均匀基线比较", "", ""],
      ["近似 p 值", formatNumber(randomness.uniformity.p_value_approx, 6), "显著性描述", "不能转换为未来号码概率", "", ""],
      ["样本量", stats.record_count, `${stats.record_count} 期 × 6 个号码`, "探索性统计", "", ""],
    ]);
    row = writeSection(sheet, row, "和值序列检验", [
      ["游程数", randomness.sum_runs_test.runs, "以和值中位数二分", "正态近似", "", ""],
      ["游程检验 p 值", formatNumber(randomness.sum_runs_test.p_value_approx, 6), "双侧近似", "未显示出显著序列偏离", "", ""],
      ["一阶自相关", formatNumber(randomness.sum_lag1_autocorrelation.observed, 6), "相邻期和值", "接近 0", "", ""],
      ["置换检验 p 值", formatNumber(randomness.sum_lag1_autocorrelation.two_sided_p_value, 6), "1000 次置换", "仅针对该检验", "", ""],
    ]);
    row = writeSection(sheet, row, "解释边界", [
      ["多重比较", "存在", "频数、结构、序列和候选特征均有探索", "p 值不得解释为预测概率", "", ""],
      ["结论", "未发现异常证据", "在本次锁定检验下", "不等同于证明绝对随机", "", ""],
    ]);
  } else if (kind === "时间回测") {
    row = writeSection(sheet, row, "时间切分", [
      ["训练区", `${backtest.partitions.training.start_date} 至 ${backtest.partitions.training.end_date}`, backtest.partitions.training.draws, "仅使用历史更早记录", "", ""],
      ["验证区", `${backtest.partitions.validation.start_date} 至 ${backtest.partitions.validation.end_date}`, backtest.partitions.validation.draws, "用于中期评估", "", ""],
      ["最终留出区", `${backtest.partitions.final_holdout.start_date} 至 ${backtest.partitions.final_holdout.end_date}`, backtest.partitions.final_holdout.draws, "最终一次评估", "", ""],
    ]);
    const rows = [["模型", "Brier", "Log Loss", "Top-6 平均命中数", "Top-6 命中率", "相对随机 Top-6"]];
    for (const [model, values] of Object.entries(backtest.summary.final_holdout)) {
      rows.push([
        model,
        formatNumber(values.brier_score, 6),
        formatNumber(values.log_loss, 6),
        formatNumber(values.top6_hits, 4),
        formatNumber(values.top6_hit_rate, 6),
        model === "random_6_of_49" ? 0 : formatNumber(values.delta_vs_random_top6_hit_rate, 6),
      ]);
    }
    row = writeSection(sheet, row, "最终留出集（324 期）", rows);
    const factory = p.stats.modelFactory;
    const modelRows = [
      ["模型槽位", "实际模型类型", "验证 mean_recall", "验证命中≥3率", "测试 mean_recall", "测试命中≥3率"],
      ...Object.entries(factory.models).map(([model, values]) => [
        model,
        values.actual_model_type,
        formatNumber(values.validation.mean_recall, 6),
        formatNumber(values.validation.hit_at_least_threshold_rate, 6),
        formatNumber(values.final_holdout.mean_recall, 6),
        formatNumber(values.final_holdout.hit_at_least_threshold_rate, 6),
      ]),
    ];
    row = writeSection(sheet, row, "阶段二五模型工厂（Top-15，命中至少 3 个）", modelRows);
    const detailRows = [
      ["模型槽位", "验证置换 p 值", "测试置换 p 值", "测试 Brier", "测试 Log Loss", "测试相对经验随机 mean_recall"],
      ...Object.entries(factory.models).map(([model, values]) => [
        model,
        formatNumber(values.validation.permutation_p_value, 6),
        formatNumber(values.final_holdout.permutation_p_value, 6),
        formatNumber(values.final_holdout.brier_score, 6),
        formatNumber(values.final_holdout.log_loss, 6),
        formatNumber(values.final_holdout_vs_empirical_random.mean_recall, 6),
      ]),
    ];
    row = writeSection(sheet, row, "阶段二模型细节与冻结评估", detailRows);
    row = writeSection(sheet, row, "阶段二随机基线与协议", [
      ["项目", "数值", "口径", "说明", "", ""],
      ["选中模型槽位", factory.selection_rule.selected_model_slot, "按 validation.mean_recall 选择", "测试集仅在配置冻结后评估", "", ""],
      ["经验随机验证 mean_recall", formatNumber(factory.empirical_random_baseline.validation.mean_recall, 6), "uniform_random_scores", "seed=20260902", "", ""],
      ["经验随机测试 mean_recall", formatNumber(factory.empirical_random_baseline.final_holdout.mean_recall, 6), "uniform_random_scores", "不可替代理论概率", "", ""],
      ["精确理论随机 P(命中≥3)", formatNumber(factory.theoretical_random_baseline.hit_at_least_probability, 12), "49 选 6，固定选 15", "超几何精确值", "", ""],
      ["配置冻结后测试评估次数", factory.test_evaluation_calls, "工厂元数据", "必须为 1", "", ""],
      ["测试集触碰分支数", factory.test_split_touch_count, "5 模型 + 经验随机", "不含理论基线", "", ""],
      ["正式 CRF", "未实现", "模型工厂状态", "当前条件马尔可夫为透明近似，不冒充正式 CRF", "", ""],
    ]);
    if (p.stats.loop2) {
      const loop2 = p.stats.loop2;
      row = writeSection(sheet, row, "第二轮特征修剪与集成", [
        ["项目", "数值", "口径", "说明", "", ""],
        ["组选择方法", loop2.feature_pruning.selected_method, "验证集 mean_recall", "只看 train/validation", "", ""],
        ["最终分组", loop2.feature_pruning.selected_groups.join("；"), "修剪结果", "第二轮选中分组", "", ""],
        ["前三模型", loop2.top_three_models.top_three_models.map((item) => item.slot).join("；"), "按验证集排序", "validation_ranking_only", "", ""],
        ["软投票验证 mean_recall", formatNumber(loop2.soft_voting.validation.mean_recall, 6), "三模型等权", "selected configuration", "", ""],
        ["软投票测试 mean_recall", formatNumber(loop2.soft_voting.final_holdout.mean_recall, 6), "冻结后一次性评估", "selected configuration", "", ""],
        ["残差候选状态", loop2.residual_candidate.status, loop2.residual_candidate.reason, `xgboost=${String(loop2.xgboost_probe.available)}`, "", ""],
        ["随机基线测试 mean_recall", formatNumber(loop2.random_baseline.final_holdout.mean_recall, 6), "uniform_random_scores", "一次性对照", "", ""],
        ["冻结/测试次数", `${loop2.configuration_frozen_before_test} / ${loop2.test_evaluation_calls}`, "协议边界", "test split only once", "", ""],
      ]);
    }
    const sumRows = [["和值模型", "MAE", "RMSE", "样本外 R²", "评估期数", "说明"]];
    for (const [model, values] of Object.entries(backtest.sum_prediction_summary.final_holdout)) {
      sumRows.push([
        model,
        formatNumber(values.mae, 4),
        formatNumber(values.rmse, 4),
        formatNumber(values.r2, 6),
        values.draws_evaluated,
        model === "theoretical_random_mean" ? "6/49 理论和值均值=150" : "只使用当期之前的历史和值",
      ]);
    }
    row = writeSection(sheet, row, "和值型目标（最终留出集）", sumRows);
    row = writeSection(sheet, row, "解释", [
      ["随机基线", "6/49 等概率", "每个号码概率固定为 6/49", "Top-6 平均命中率约为 6/49", "", ""],
      ["样本外结论", "未发现稳定优势", "频率模型的 Brier/Log Loss 未优于随机基线", "不能承诺未来命中率", "", ""],
      ["R²/RMSE", "仅用于和值型目标", "开奖号码本身是无序集合", "和值 R² 未显示可泛化解释力", "", ""],
    ]);
  } else {
    const featureHyperspace = p.stats.featureHyperspace;
    row = writeSection(sheet, row, "候选编码", [
      ["日干支", esoteric.encoding.day_ganzhi, "预注册编码", "用于条件频率探索", "", ""],
      ["年干支", esoteric.encoding.year_ganzhi, "预注册编码", "用于条件频率探索", "", ""],
      ["号码映射", esoteric.encoding.number_to_branch, "探索性映射", "不是官方开奖机制", "", ""],
      ["传统资料", esoteric.encoding.traditional_tables.join("；"), "本地资料", "仅用于定义候选变量", "", ""],
    ]);
    const rows = [["模型", "验证集 Top-6 命中率", "最终留出 Top-6 命中率", "最终留出 Brier", "最终留出 Log Loss", "相对随机"]];
    for (const [model, values] of Object.entries(esoteric.final_holdout_conditioned_models)) {
      rows.push([
        model,
        formatNumber(esoteric.validation_conditioned_models[model]?.top6_hit_rate, 6),
        formatNumber(values.top6_hit_rate, 6),
        formatNumber(values.brier_score, 6),
        formatNumber(values.log_loss, 6),
        formatNumber(values.delta_vs_random_top6_hit_rate, 6),
      ]);
    }
    row = writeSection(sheet, row, "候选特征回测", rows);
    row = writeSection(sheet, row, "阶段一互信息权重", [
      ["特征", "原始 MI", "归一化 MI", "实验权重", "基数", "解释"],
      ...Object.entries(featureHyperspace.mi_weights).map(([feature, values]) => [
        feature,
        formatNumber(values.raw_mi, 8),
        formatNumber(values.normalized_mi, 8),
        formatNumber(values.weight, 8),
        values.cardinality,
        "仅作候选变量降权，不代表因果关系",
      ]),
    ]);
    const factory = p.stats.modelFactory;
    row = writeSection(sheet, row, "阶段二候选模型限制", [
      ["项目", "内容", "状态", "边界", "", ""],
      ["模型槽位", Object.keys(factory.models).join("；"), "已运行", "统一时间切分和一次性测试评估", "", ""],
      ["输入排除", "draw_id、draw_index、draw_date、number、is_drawn", "已执行", "防止标识列或目标标签泄漏", "", ""],
      ["冻结模式", "Markov=frozen_history；TCN/BPR=frozen_train_history", "已披露", "验证/测试不回写真实标签", "", ""],
      ["玄学变量定位", "候选实验特征", "已限定", "不得写成开奖机制或确定性规律", "", ""],
    ]);
    writeSection(sheet, row, "结论边界", [
      ["解释", "未发现可复现、可泛化的预测证据", "", "", "", ""],
      ["限制", esoteric.interpretation, "", "", "", ""],
      ["禁止项", "不输出下一期号码、胆码、杀号、投注组合或收益预测", "", "", "", ""],
    ]);
  }
  setCommonWidths(sheet);
}

function makeConclusion(sheet, p) {
  titleBand(sheet, "结论与限制", `${p.productCn}当前证据边界与后续动作`);
  statusBand(
    sheet,
    p.complete
      ? "当前结论：已完成历史样本统计和严格时间留出回测，但没有稳定超越随机基线的样本外证据；不输出下一期号码或投注建议。"
      : "当前不能探索号码规律：没有可核验逐期开奖记录。任何预测概率、R²、RMSE 或“70%命中率”在本工作簿中均不存在。",
  );
  let row = 8;
  if (p.complete) {
    const backtest = p.stats.backtest;
    row = writeSection(sheet, row, "当前结论", [
      ["状态", "COMPLETE（带明确缺口）", "", "", "", ""],
      ["记录数", p.recordCount, `${p.dateMin} 至 ${p.dateMax}`, "全部 verified", "", ""],
      ["均匀性", "未见显著偏离证据", "卡方近似 p 值见“随机性检验”", "这是历史样本描述", "", ""],
      ["样本外预测", "未发现稳定优势", "最终留出区与随机 6/49 基线比较", "不能承诺未来表现", "", ""],
    ]);
    row = writeSection(sheet, row, "关键限制", [
      ["数据缺口", "2006-01-01 至 2006-12-31", "官方年度索引/文件覆盖边界", "未使用非官方数据补齐", "", ""],
      ["研究范围", "2026-08-01 至 2026-08-31 排除", "用户冻结范围", "不采集、不分析、不作为待补缺口", "", ""],
      ["公布时间", "无法确认", "官方年度 CSV 未提供", "published_time 保持为空", "", ""],
      ["规则边界", p.ruleStatus, "", "", "", ""],
      ["模型边界", "开奖号码为无序集合", "R²/RMSE 不是唯一评价指标", "使用 Brier、Log Loss、Top-6 和时间留出", "", ""],
    ]);
    row = writeSection(sheet, row, "回测摘要", [
      ["验证区", `${backtest.partitions.validation.start_date} 至 ${backtest.partitions.validation.end_date}`, backtest.partitions.validation.draws, "", "", ""],
      ["最终留出区", `${backtest.partitions.final_holdout.start_date} 至 ${backtest.partitions.final_holdout.end_date}`, backtest.partitions.final_holdout.draws, "", "", ""],
      ["基线", "random_6_of_49", formatNumber(backtest.summary.final_holdout.random_6_of_49.top6_hit_rate, 6), "Top-6 命中率", "", ""],
      ["最佳 Top-6（历史留出）", "frequency_recent_100", formatNumber(backtest.summary.final_holdout.frequency_recent_100.top6_hit_rate, 6), "仅为本次固定实验结果", "", ""],
    ]);
    const factory = p.stats.modelFactory;
    const selected = factory.models[factory.selection_rule.selected_model_slot];
    row = writeSection(sheet, row, "阶段二模型工厂摘要", [
      ["项目", "验证集", "最终测试集", "口径", "解释", ""],
      ["选中模型", factory.selection_rule.selected_model_slot, factory.selection_rule.selected_model_slot, "按验证集 mean_recall 选优", "不构成未来预测承诺", ""],
      ["mean_recall", formatNumber(selected.validation.mean_recall, 6), formatNumber(selected.final_holdout.mean_recall, 6), "Top-15 平均召回", "未达到项目预注册的 45% 稳定门槛", ""],
      ["命中≥3率", formatNumber(selected.validation.hit_at_least_threshold_rate, 6), formatNumber(selected.final_holdout.hit_at_least_threshold_rate, 6), "Top-15 命中至少 3 个", "测试结果未显示可泛化优势", ""],
      ["精确理论随机概率", formatNumber(factory.theoretical_random_baseline.hit_at_least_probability, 12), formatNumber(factory.theoretical_random_baseline.hit_at_least_probability, 12), "49 选 6，固定选 15", "仅是随机抽样理论基线", ""],
      ["配置冻结/测试次数", String(factory.configuration_frozen_before_test) + " / " + factory.test_evaluation_calls, String(factory.configuration_frozen_before_test) + " / " + factory.test_evaluation_calls, "冻结后统一评估", "测试集未用于调参", ""],
    ]);
    writeSection(sheet, row, "禁止与后续", [
      ["禁止项", "不输出下一期号码、胆码、杀号、投注组合、追号或收益预测", "", "", "", ""],
      ["后续", "如补齐缺口，应重新锁定版本、重新执行全流程并保留本次结果", "", "", "", ""],
    ]);
    setCommonWidths(sheet);
    return;
  }
  row = writeSection(sheet, row, "当前结论", [
    ["状态", "BLOCKED", "", "", "", ""],
    ["记录数", "0", "", "", "", ""],
    ["号码级分析状态", "not_generated", "无 verified 逐期数据", "当前不生成号码级模型", "", ""],
    ["号码级模型列表", "[]", "number_level_models", "保持空列表，避免把预案误写成结果", "", ""],
    ["阻塞原因", "no_verified_draw_level_data", "模型工厂元数据口径", "需先取得官方逐期数据", "", ""],
    ["规律检验", "不可开展", "", "", "", ""],
    ["预测证据", "未发现；当前没有可检验样本", "", "", "", ""],
  ]);
  row = writeSection(sheet, row, "关键限制", [
    ["数据限制", p.sourceSummary, "", "", "", ""],
    ["覆盖限制", p.missing, "", "", "", "", ""],
    ["规则限制", p.ruleStatus, "", "", "", "", ""],
    ["解释限制", "来源入口不等于逐期开奖记录", "", "", "", "", ""],
  ]);
  writeSection(sheet, row, "下一步", [
    ["1", "取得官方可保存的逐期开奖文件或页面证据。", "", "", "", ""],
    ["2", "由对应采集智能体补充原始 CSV 和来源映射。", "", "", "", ""],
    ["3", "完成号码、期号、日期和冲突检查。", "", "", "", ""],
    ["4", "再启动描述统计、随机性检验、时间回测和玄学特征实验。", "", "", "", ""],
  ]);
  setCommonWidths(sheet);
}

async function buildWorkbook(p) {
  const rawRows = parseCsv(await fs.readFile(p.rawCsv, "utf8"));
  const sourceRows = parseCsv(await fs.readFile(p.sourceCsv, "utf8"));
  if (p.complete) {
    p.stats = {
      descriptive: JSON.parse(await fs.readFile(p.analysis.descriptive, "utf8")),
      randomness: JSON.parse(await fs.readFile(p.analysis.randomness, "utf8")),
      backtest: JSON.parse(await fs.readFile(p.analysis.backtest, "utf8")),
      esoteric: JSON.parse(await fs.readFile(p.analysis.esoteric, "utf8")),
      featureHyperspace: JSON.parse(await fs.readFile(p.analysis.featureHyperspace, "utf8")),
      modelFactory: JSON.parse(await fs.readFile(p.analysis.modelFactory, "utf8")),
    };
    p.stats.loop2 = await loadJsonIfExists(p.analysis.loop2Summary);
    const checks = deriveTaiwanChecks(rawRows);
    Object.assign(p, checks);
    p.sourceCount = sourceRows.length - 1;
  }
  const sourceHeader = sourceRows[0] ?? [];
  const sourceIndexes = Object.fromEntries(sourceHeader.map((name, index) => [name, index]));
  p.sourceCount = Math.max(0, sourceRows.length - 1);
  p.verifiedSourceCount = sourceRows
    .slice(1)
    .filter((row) => row[sourceIndexes.status] === "verified")
    .length;
  const workbook = Workbook.create();
  for (const name of sheetNames) {
    applyBaseSheet(workbook.worksheets.add(name));
  }
  makeReadme(workbook.worksheets.getItem("README"), p);
  makeDictionary(workbook.worksheets.getItem("数据字典"), p);
  makeCsvSheet(workbook.worksheets.getItem("原始开奖"), p, rawRows, "raw");
  makeCsvSheet(workbook.worksheets.getItem("来源登记"), p, sourceRows, "source");
  makeQuality(workbook.worksheets.getItem("质量检查"), p);
  makeMethodSheet(workbook.worksheets.getItem("描述统计"), p, "描述统计");
  makeMethodSheet(workbook.worksheets.getItem("随机性检验"), p, "随机性检验");
  makeMethodSheet(workbook.worksheets.getItem("时间回测"), p, "时间回测");
  makeMethodSheet(workbook.worksheets.getItem("玄学特征"), p, "玄学特征");
  makeConclusion(workbook.worksheets.getItem("结论与限制"), p);

  await fs.mkdir(path.dirname(p.output), { recursive: true });
  const evidenceProductDir = path.join(EVIDENCE_DIR, p.key);
  await fs.mkdir(evidenceProductDir, { recursive: true });

  const inspected = {};
  inspected.readme = JSON.parse(
    (await workbook.inspect({
      kind: "table",
      range: "README!A1:H15",
      include: "values,formulas",
      tableMaxRows: 20,
      tableMaxCols: 10,
      maxChars: 12000,
    })).ndjson.split("\n").filter(Boolean)[0] || "{}",
  );
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: `${p.productCn}最终公式错误扫描`,
    maxChars: 12000,
  });
  inspected.formulaErrorScan = errors.ndjson;
  inspected.renders = [];
  for (const sheetName of sheetNames) {
    const ranges = sheetName === "原始开奖" && p.complete
      ? ["A1:R30", "A1000:R1030", "A2125:R2160"]
      : [
          sheetName === "原始开奖"
            ? "A1:R30"
            : (sheetName === "描述统计" && p.complete ? "A1:H220" : "A1:H80"),
        ];
    for (const range of ranges) {
      const suffix = ranges.length > 1 ? `_${range.replace(/[:]/g, "-")}` : "";
      const blob = await workbook.render({
        sheetName,
        range,
        scale: 1,
        format: "png",
      });
      const renderPath = path.join(evidenceProductDir, `${sheetName}${suffix}.png`);
      await fs.writeFile(renderPath, new Uint8Array(await blob.arrayBuffer()));
      inspected.renders.push(renderPath);
    }
  }

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(p.output);
  return {
    product: p.productCn,
    output: p.output,
    rawRows: Math.max(0, rawRows.length - 1),
    sourceRows: Math.max(0, sourceRows.length - 1),
    sheetNames,
    inspect: inspected,
  };
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(path.dirname(VERIFY_PATH), { recursive: true });
const results = [];
for (const product of products) {
  results.push(await buildWorkbook(product));
}
  await fs.writeFile(
  VERIFY_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: "taiwan-complete-macau-blocked",
      recordCounts: {
        taiwan: results.find((result) => result.product === "台湾大乐透")?.rawRows ?? 0,
        macau: results.find((result) => result.product === "澳门白鸽票")?.rawRows ?? 0,
      },
      workbooks: results,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(JSON.stringify(results.map((r) => ({
  product: r.product,
  output: r.output,
  rawRows: r.rawRows,
  sourceRows: r.sourceRows,
  sheetCount: r.sheetNames.length,
  renderCount: r.inspect.renders.length,
})), null, 2));
