
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
  grid-auto-columns: 119px;
  gap: 0;
  width: max-content;
  color: var(--text-muted);
  font-size: 13px;
  margin-left: 0;
  margin-bottom: 4px;
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

@media (max-width: 700px) {
  .leetcode-summary {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
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

// 月份标签：按周列展示
const weeks = [];
for (let i = 0; i < allDates.length; i += 7) {
  weeks.push(allDates.slice(i, i + 7));
}

let lastMonth = "";

for (const week of weeks) {
  const firstDay = week[0];
  const month = firstDay.format("M月");

  const monthEl = document.createElement("div");

  if (month !== lastMonth) {
    monthEl.textContent = month;
    lastMonth = month;
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

// 默认显示今天；如果今天没有记录，则显示最近一天
const latestDate = records.length > 0 ? records[0].date : today.format("YYYY-MM-DD");
renderDetail(byDate.has(today.format("YYYY-MM-DD")) ? today.format("YYYY-MM-DD") : latestDate);
dashboard.appendChild(detail);

// ==============================
// Render Daily Tables
// ==============================

dv.header(2, "每日完成明细");

const groups = records.reduce((map, record) => {
  if (!map.has(record.date)) map.set(record.date, []);
  map.get(record.date).push(record);
  return map;
}, new Map());

const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

if (sortedDates.length === 0) {
  dv.paragraph("没有找到满足条件的 LeetCode 题解。");
} else {
  for (const date of sortedDates) {
    const list = groups.get(date).sort((a, b) => a.lcId - b.lcId);

    dv.header(3, `${date} ｜完成 ${list.length} 题`);

    dv.table(
      ["题号", "题目", "难度", "文件"],
      list.map(item => [
        item.lcId === 999999 ? "" : item.lcId,
        item.title,
        item.difficulty,
        item.link
      ])
    );
  }
}
```