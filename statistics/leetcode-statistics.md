
```dataviewjs
// ==============================
// LeetCode DataviewJS Statistics
// 适配目录：notes/leetcode
// ==============================

const LEETCODE_FOLDER = "notes/leetcode";
const HEATMAP_DAYS = 180; // 显示最近 180 天，可以改成 365

const pages = dv.pages()
  .where(p =>
    p.file.folder === LEETCODE_FOLDER &&
    !p.file.name.includes("统计") &&
    !p.file.name.includes("statistics") &&
    String(p.type ?? "").trim() === "leetcode" &&
    String(p.status ?? "").trim() === "done" &&
    p.done_date
  );

function formatDate(dateValue) {
  if (!dateValue) return "未知日期";

  if (dateValue.toFormat) {
    return dateValue.toFormat("yyyy-MM-dd");
  }

  return String(dateValue)
    .replaceAll("/", "-")
    .slice(0, 10);
}

function toMoment(dateValue) {
  const str = formatDate(dateValue);
  return window.moment(str, "YYYY-MM-DD");
}

function formatTitle(page) {
  const id = page.lc_id ?? page["leetcode-index"] ?? "";
  const title = page.title ?? page.file.name;
  return id ? `${id}. ${title}` : title;
}

function difficultyClass(difficulty) {
  const text = String(difficulty ?? "");
  if (text.includes("简单") || text.toLowerCase() === "easy") return "easy";
  if (text.includes("中等") || text.toLowerCase() === "medium") return "medium";
  if (text.includes("困难") || text.toLowerCase() === "hard") return "hard";
  return "unknown";
}

const records = pages
  .array()
  .map(p => ({
    page: p,
    date: formatDate(p.done_date),
    moment: toMoment(p.done_date),
    lcId: Number(p.lc_id ?? p["leetcode-index"] ?? 999999),
    title: p.title ?? p.file.name,
    difficulty: p.difficulty ?? "",
    link: p.file.link,
    path: p.file.path,
  }))
  .filter(r => r.date !== "未知日期" && r.moment.isValid())
  .sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.lcId - b.lcId;
  });

const byDate = new Map();

for (const record of records) {
  if (!byDate.has(record.date)) {
    byDate.set(record.date, []);
  }
  byDate.get(record.date).push(record);
}

for (const [date, list] of byDate.entries()) {
  list.sort((a, b) => a.lcId - b.lcId);
}

const today = window.moment().startOf("day");
const monthStart = today.clone().startOf("month");

const totalCount = records.length;

const monthCount = records.filter(r =>
  r.moment.isSameOrAfter(monthStart, "day")
).length;

function calcCurrentStreak() {
  let streak = 0;
  let cur = today.clone();

  while (true) {
    const key = cur.format("YYYY-MM-DD");

    if (byDate.has(key)) {
      streak++;
      cur.subtract(1, "day");
      continue;
    }

    break;
  }

  return streak;
}

function calcLongestStreak() {
  if (byDate.size === 0) return 0;

  const dates = Array.from(byDate.keys()).sort();
  let longest = 0;
  let current = 0;
  let prev = null;

  for (const date of dates) {
    const m = window.moment(date, "YYYY-MM-DD");

    if (!prev) {
      current = 1;
    } else {
      const diff = m.diff(prev, "days");
      current = diff === 1 ? current + 1 : 1;
    }

    longest = Math.max(longest, current);
    prev = m;
  }

  return longest;
}

const currentStreak = calcCurrentStreak();
const longestStreak = calcLongestStreak();

function countLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// ==============================
// CSS
// ==============================

const style = document.createElement("style");
style.textContent = `
.leetcode-dashboard {
  margin: 1rem 0 1.5rem 0;
  padding: 18px 18px 14px 18px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  background: var(--background-secondary);
}

.leetcode-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.leetcode-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.leetcode-card-title {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 6px;
}

.leetcode-card-value {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
}

.leetcode-card-unit {
  font-size: 14px;
  color: var(--text-muted);
  margin-left: 4px;
}

.leetcode-heatmap-wrap {
  overflow-x: auto;
  padding-bottom: 4px;
}

.leetcode-heatmap {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 13px;
  grid-template-rows: repeat(7, 13px);
  gap: 4px;
  align-items: center;
  width: max-content;
  padding: 4px 0 8px 0;
}

.leetcode-cell {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--background-modifier-border);
}

.leetcode-cell:hover {
  outline: 2px solid var(--text-accent);
  outline-offset: 1px;
}

.leetcode-cell[data-level="0"] {
  background: var(--background-modifier-border);
  opacity: 0.55;
}

.leetcode-cell[data-level="1"] {
  background: #7ee787;
}

.leetcode-cell[data-level="2"] {
  background: #3fb950;
}

.leetcode-cell[data-level="3"] {
  background: #2ea043;
}

.leetcode-cell[data-level="4"] {
  background: #238636;
}

.leetcode-months {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 13px;
  gap: 4px;
  width: max-content;
  color: var(--text-muted);
  font-size: 13px;
  margin-left: 0;
  margin-bottom: 4px;
  overflow: visible;
}

.leetcode-months > div {
  width: max-content;
  white-space: nowrap;
  pointer-events: none;
}

.leetcode-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 8px;
}

.leetcode-legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.leetcode-detail {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.leetcode-detail-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 10px;
}

.leetcode-detail-empty {
  color: var(--text-muted);
}

.leetcode-detail-list {
  margin: 0;
  padding-left: 1.2rem;
}

.leetcode-detail-list li {
  margin: 6px 0;
}

.leetcode-badge {
  display: inline-block;
  min-width: 38px;
  text-align: center;
  padding: 1px 7px;
  margin-left: 6px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--background-modifier-border);
}

.leetcode-badge.easy {
  color: #3fb950;
}

.leetcode-badge.medium {
  color: #d29922;
}

.leetcode-badge.hard {
  color: #f85149;
}

.leetcode-section-title {
  margin-top: 2rem;
  margin-bottom: 0.8rem;
}

.leetcode-cell.is-selected {  
outline: 2px solid var(--text-accent);  
outline-offset: 2px;  
}


.leetcode-daily-section {
  margin-top: 2.4rem;
}

.leetcode-daily-title {
  margin: 0 0 1.25rem 0;
  font-size: 1.65rem;
  line-height: 1.25;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.leetcode-day-block {
  margin: 0 0 2.6rem 0;
  padding: 18px 18px 22px 18px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  background: var(--background-secondary);
}

.leetcode-day-block + .leetcode-day-block {
  margin-top: 2.1rem;
}

.leetcode-day-heading {
  margin: 0 0 1.05rem 0;
  padding-left: 12px;
  border-left: 4px solid var(--text-accent);
  color: var(--text-accent);
  font-size: 1.45rem;
  line-height: 1.25;
  font-weight: 900;
}

.leetcode-day-table-wrap {
  overflow-x: hidden;
  max-width: 100%;
}

.leetcode-day-table {
  width: 100%;
  min-width: 0;
}

.leetcode-day-row {
  display: grid;
  /*
   * 题号列适当加宽：让“题目”列回到更自然的位置；
   * 题目列改为固定上限：避免短题目时仍把“难度”列推得很远；
   * 剩余空间全部交给文件列，因此不会再出现横向滚动条。
   */
  grid-template-columns: 200px minmax(260px, 360px) 86px minmax(0, 1fr);
  column-gap: 16px;
  align-items: center;
  min-height: 34px;
  padding: 5px 12px;
  box-sizing: border-box;
}

.leetcode-day-row.header {
  min-height: 40px;
  border-bottom: 2px solid var(--text-muted);
  color: var(--text-normal);
  font-size: 1.02rem;
  font-weight: 800;
}

.leetcode-day-row:not(.header) {
  border-bottom: 1px dashed var(--background-modifier-border);
}

.leetcode-day-row:not(.header):last-child {
  border-bottom: none;
}

.leetcode-day-cell {
  min-width: 0;
  text-align: left;
}

.leetcode-day-cell.title,
.leetcode-day-cell.file {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.leetcode-day-cell.file .internal-link {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.leetcode-difficulty {
  font-weight: 700;
}

.leetcode-difficulty.easy {
  color: #3fb950;
}

.leetcode-difficulty.medium {
  color: #d29922;
}

.leetcode-difficulty.hard {
  color: #f85149;
}

@media (max-width: 900px) {
  .leetcode-day-row {
    grid-template-columns: 120px minmax(180px, 1fr) 76px minmax(0, 0.9fr);
    column-gap: 12px;
  }
}

@media (max-width: 700px) {
  .leetcode-summary {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .leetcode-day-row {
    grid-template-columns: 72px minmax(120px, 1fr) 64px minmax(0, 0.8fr);
    column-gap: 10px;
    padding-left: 8px;
    padding-right: 8px;
  }
}
`;
document.head.appendChild(style);

// ==============================
// Render Dashboard
// ==============================

const dashboard = dv.el("div", "", {
  cls: "leetcode-dashboard"
});

const summary = document.createElement("div");
summary.className = "leetcode-summary";

function createCard(title, value, unit) {
  const card = document.createElement("div");
  card.className = "leetcode-card";

  const titleEl = document.createElement("div");
  titleEl.className = "leetcode-card-title";
  titleEl.textContent = title;

  const valueEl = document.createElement("div");
  valueEl.className = "leetcode-card-value";
  valueEl.innerHTML = `${value}<span class="leetcode-card-unit">${unit}</span>`;

  card.appendChild(titleEl);
  card.appendChild(valueEl);

  return card;
}

summary.appendChild(createCard("总完成", totalCount, "题"));
summary.appendChild(createCard("本月解决", monthCount, "题"));
summary.appendChild(createCard("当前连续", currentStreak, "天"));
summary.appendChild(createCard("最长连续", longestStreak, "天"));

dashboard.appendChild(summary);

const heatmapWrap = document.createElement("div");
heatmapWrap.className = "leetcode-heatmap-wrap";

const monthsRow = document.createElement("div");
monthsRow.className = "leetcode-months";

const heatmap = document.createElement("div");
heatmap.className = "leetcode-heatmap";

const detail = document.createElement("div");
detail.className = "leetcode-detail";

function renderDetail(date) {
  const list = byDate.get(date) ?? [];

  detail.innerHTML = "";

  const title = document.createElement("div");
  title.className = "leetcode-detail-title";
  title.textContent = `${date} ｜完成 ${list.length} 题`;
  detail.appendChild(title);

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "leetcode-detail-empty";
    empty.textContent = "这一天没有记录到已完成题解。";
    detail.appendChild(empty);
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "leetcode-detail-list";

  for (const item of list) {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.href = item.path;
    link.className = "internal-link";
    link.textContent = `${item.lcId === 999999 ? "" : item.lcId + ". "}${item.title}`;

    const badge = document.createElement("span");
    badge.className = `leetcode-badge ${difficultyClass(item.difficulty)}`;
    badge.textContent = item.difficulty || "未知";

    li.appendChild(link);
    li.appendChild(badge);
    ul.appendChild(li);
  }

  detail.appendChild(ul);
}

// 让热力图从周一开始
const endDate = today.clone();
const startDate = today.clone()
  .subtract(HEATMAP_DAYS - 1, "days")
  .startOf("isoWeek");

const allDates = [];
let cursor = startDate.clone();

while (cursor.isSameOrBefore(endDate, "day")) {
  allDates.push(cursor.clone());
  cursor.add(1, "day");
}

// 月份标签：按周列展示，只在每月 1 号所在周显示月份
const weeks = [];
for (let i = 0; i < allDates.length; i += 7) {
  weeks.push(allDates.slice(i, i + 7));
}

let lastMonthKey = "";
let lastLabelWeekIndex = -999;

// 至少间隔 3 周才允许显示下一个月份标签，避免 11月 / 12月 这种贴太近重叠
const MIN_MONTH_LABEL_GAP = 3;

for (let i = 0; i < weeks.length; i++) {
  const week = weeks[i];
  const monthEl = document.createElement("div");

  const firstDayOfMonth = week.find(d => d.date() === 1);

  if (firstDayOfMonth) {
    const monthKey = firstDayOfMonth.format("YYYY-MM");

    if (
      monthKey !== lastMonthKey &&
      i - lastLabelWeekIndex >= MIN_MONTH_LABEL_GAP
    ) {
      monthEl.textContent = firstDayOfMonth.format("M月");
      lastMonthKey = monthKey;
      lastLabelWeekIndex = i;
    } else {
      monthEl.textContent = "";
    }
  } else {
    monthEl.textContent = "";
  }

  monthsRow.appendChild(monthEl);
}

for (const dateMoment of allDates) {  
const date = dateMoment.format("YYYY-MM-DD");  
const count = byDate.get(date)?.length ?? 0;  
  
const cell = document.createElement("button");  
cell.className = "leetcode-cell";  
cell.dataset.level = String(countLevel(count));  
cell.dataset.date = date;  
cell.dataset.count = String(count);  
  
cell.addEventListener("click", () => {  
document  
.querySelectorAll(".leetcode-cell.is-selected")  
.forEach(el => el.classList.remove("is-selected"));  
  
cell.classList.add("is-selected");  
renderDetail(date);  
});  
  
heatmap.appendChild(cell);  
}

const legend = document.createElement("div");
legend.className = "leetcode-legend";
legend.innerHTML = `
  <span>少</span>
  <span class="leetcode-legend-cell leetcode-cell" data-level="0"></span>
  <span class="leetcode-legend-cell leetcode-cell" data-level="1"></span>
  <span class="leetcode-legend-cell leetcode-cell" data-level="2"></span>
  <span class="leetcode-legend-cell leetcode-cell" data-level="3"></span>
  <span class="leetcode-legend-cell leetcode-cell" data-level="4"></span>
  <span>多</span>
`;

heatmapWrap.appendChild(monthsRow);
heatmapWrap.appendChild(heatmap);
heatmapWrap.appendChild(legend);
dashboard.appendChild(heatmapWrap);

requestAnimationFrame(() => {
  heatmapWrap.scrollLeft = heatmapWrap.scrollWidth;
});

// 默认显示今天；如果今天没有记录，则显示最近一天
const latestDate = records.length > 0 ? records[0].date : today.format("YYYY-MM-DD");
renderDetail(byDate.has(today.format("YYYY-MM-DD")) ? today.format("YYYY-MM-DD") : latestDate);
dashboard.appendChild(detail);

// ==============================
// Render Daily Tables
// 使用自定义 grid 表格，避免不同日期因题目长度不同导致列不对齐
// ==============================

const dailyRoot = dv.el("div", "", {
  cls: "leetcode-daily-section"
});

const dailyTitle = document.createElement("div");
dailyTitle.className = "leetcode-daily-title";
dailyTitle.textContent = "每日完成明细";
dailyRoot.appendChild(dailyTitle);

const groups = records.reduce((map, record) => {
  if (!map.has(record.date)) map.set(record.date, []);
  map.get(record.date).push(record);
  return map;
}, new Map());

const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

function createDayCell(text, cls = "") {
  const cell = document.createElement("div");
  cell.className = `leetcode-day-cell ${cls}`.trim();
  cell.textContent = text;
  cell.title = text;
  return cell;
}

function createInternalLink(path, text) {
  const link = document.createElement("a");
  link.href = path;
  link.className = "internal-link";
  link.textContent = text;
  link.title = text;
  return link;
}

if (sortedDates.length === 0) {
  const empty = document.createElement("div");
  empty.className = "leetcode-detail-empty";
  empty.textContent = "没有找到满足条件的 LeetCode 题解。";
  dailyRoot.appendChild(empty);
} else {
  for (const date of sortedDates) {
    const list = groups.get(date).sort((a, b) => a.lcId - b.lcId);

    const block = document.createElement("section");
    block.className = "leetcode-day-block";

    const heading = document.createElement("div");
    heading.className = "leetcode-day-heading";
    heading.textContent = `${date} ｜完成 ${list.length} 题`;
    block.appendChild(heading);

    const tableWrap = document.createElement("div");
    tableWrap.className = "leetcode-day-table-wrap";

    const table = document.createElement("div");
    table.className = "leetcode-day-table";

    const header = document.createElement("div");
    header.className = "leetcode-day-row header";
    header.appendChild(createDayCell(`题号 (${list.length})`));
    header.appendChild(createDayCell("题目"));
    header.appendChild(createDayCell("难度"));
    header.appendChild(createDayCell("文件"));
    table.appendChild(header);

    for (const item of list) {
      const row = document.createElement("div");
      row.className = "leetcode-day-row";

      row.appendChild(createDayCell(item.lcId === 999999 ? "" : String(item.lcId)));
      row.appendChild(createDayCell(item.title, "title"));

      const difficulty = document.createElement("div");
      difficulty.className = "leetcode-day-cell";
      const difficultySpan = document.createElement("span");
      difficultySpan.className = `leetcode-difficulty ${difficultyClass(item.difficulty)}`;
      difficultySpan.textContent = item.difficulty || "未知";
      difficulty.appendChild(difficultySpan);
      row.appendChild(difficulty);

      const fileCell = document.createElement("div");
      fileCell.className = "leetcode-day-cell file";
      const fileText = `${item.lcId === 999999 ? "" : item.lcId + ". "}${item.title}`;
      fileCell.appendChild(createInternalLink(item.path, fileText));
      row.appendChild(fileCell);

      table.appendChild(row);
    }

    tableWrap.appendChild(table);
    block.appendChild(tableWrap);
    dailyRoot.appendChild(block);
  }
}
```