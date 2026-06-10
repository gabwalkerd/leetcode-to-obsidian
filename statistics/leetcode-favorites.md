```dataviewjs
// ==============================
// LeetCode Favorite Solutions
// 适配目录：任意 Solution/solutions 目录及其子目录
// ==============================

const LEETCODE_FOLDER_NAMES = ["solution", "solutions"];

function isFavoriteValue(value) {
  if (value === true) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "favorite", "starred"].includes(text);
}

function normalizeId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const numeric = Number(text);
  if (Number.isFinite(numeric)) return String(numeric);

  return text;
}

function difficultyLabel(difficulty) {
  const text = String(difficulty ?? "").trim().toLowerCase();
  if (text === "easy" || text === "简单") return "简单";
  if (text === "medium" || text === "中等") return "中等";
  if (text === "hard" || text === "困难") return "困难";
  return "未知";
}

function difficultyClass(difficulty) {
  const label = difficultyLabel(difficulty);
  if (label === "简单") return "easy";
  if (label === "中等") return "medium";
  if (label === "困难") return "hard";
  return "unknown";
}

function pagePathInCurrentFolder(fileName) {
  const currentFolder = dv.current()?.file?.folder ?? "";
  return currentFolder ? `${currentFolder}/${fileName}` : fileName;
}

function isInLeetCodeSolutionFolder(page) {
  const folder = String(page.file.folder ?? "");
  if (!folder) return false;

  return folder
    .split("/")
    .map(part => part.trim().toLowerCase())
    .some(part => LEETCODE_FOLDER_NAMES.includes(part));
}

const records = dv.pages()
  .where(p =>
    isInLeetCodeSolutionFolder(p) &&
    String(p.type ?? "").trim() === "leetcode" &&
    isFavoriteValue(p.favorite ?? p.starred)
  )
  .array()
  .map(p => {
    const id = normalizeId(p.lc_id ?? p["leetcode-index"] ?? "");
    const title = String(p.title ?? p.file.name ?? "").trim();
    const difficulty = difficultyLabel(p.difficulty_raw ?? p.difficultyRaw ?? p.difficulty);

    return {
      id,
      title: id ? `${id}. ${title}` : title,
      difficulty,
      difficultyClass: difficultyClass(difficulty),
      path: p.file.path,
    };
  })
  .sort((a, b) => {
    const order = { "困难": 0, "中等": 1, "简单": 2, "未知": 3 };
    const difficultyDiff = (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9);
    if (difficultyDiff !== 0) return difficultyDiff;
    return Number(a.id || 999999) - Number(b.id || 999999);
  });

const style = document.createElement("style");
style.textContent = `
.leetcode-favorites-root {
  margin: 1rem 0 1.5rem 0;
  padding: 18px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  background: var(--background-secondary);
}

.leetcode-favorites-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.leetcode-favorites-title {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 850;
}

.leetcode-favorites-subtitle {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.leetcode-favorites-actions a {
  color: var(--text-accent);
  font-size: 13px;
  white-space: nowrap;
}

.leetcode-favorites-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.leetcode-favorites-card {
  padding: 13px 15px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.leetcode-favorites-card-label {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 5px;
}

.leetcode-favorites-card-value {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 800;
}

.leetcode-favorites-group {
  overflow: hidden;
  margin-top: 20px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 14px;
  background: var(--background-primary);
}

.leetcode-favorites-group-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  font-size: 16px;
  font-weight: 760;
}

.leetcode-favorites-group-count {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.leetcode-favorites-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 70px;
  gap: 14px;
  align-items: center;
  min-height: 54px;
  padding: 7px 24px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  transition: background 120ms ease;
}

.leetcode-favorites-row:hover {
  background: var(--background-secondary);
}

.leetcode-favorites-row:last-child {
  border-bottom: none;
}

.leetcode-favorites-status {
  width: 20px;
  height: 20px;
  border: 2px solid #eab308;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #eab308;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.leetcode-favorites-title-link {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-normal);
  font-size: 16px;
  font-weight: 720;
  text-decoration: none;
}

.leetcode-favorites-title-link:hover {
  color: var(--text-accent);
  text-decoration: none;
}

.leetcode-favorites-difficulty {
  text-align: right;
  font-size: 16px;
  font-weight: 760;
  white-space: nowrap;
}

.leetcode-favorites-difficulty.easy {
  color: #22c55e;
}

.leetcode-favorites-difficulty.medium {
  color: #eab308;
}

.leetcode-favorites-difficulty.hard {
  color: #ef4444;
}

.leetcode-favorites-difficulty.unknown {
  color: var(--text-muted);
}

.leetcode-favorites-empty {
  padding: 18px 16px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 720;
  line-height: 1.5;
}

@media (max-width: 700px) {
  .leetcode-favorites-header {
    display: block;
  }

  .leetcode-favorites-actions a {
    display: inline-block;
    margin-top: 8px;
  }

  .leetcode-favorites-summary {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .leetcode-favorites-row {
    grid-template-columns: 26px minmax(0, 1fr) 52px;
    gap: 10px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .leetcode-favorites-title-link,
  .leetcode-favorites-difficulty {
    font-size: 14px;
  }
}
`;
document.head.appendChild(style);

function createSummaryCard(label, value) {
  const card = document.createElement("div");
  card.className = "leetcode-favorites-card";

  const labelEl = document.createElement("div");
  labelEl.className = "leetcode-favorites-card-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "leetcode-favorites-card-value";
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);

  return card;
}

function renderRecord(groupEl, record) {
  const row = document.createElement("div");
  row.className = "leetcode-favorites-row";

  const status = document.createElement("span");
  status.className = "leetcode-favorites-status";
  status.textContent = "★";
  row.appendChild(status);

  const link = document.createElement("a");
  link.className = "leetcode-favorites-title-link internal-link";
  link.href = record.path;
  link.textContent = record.title || "未命名题解";
  link.title = link.textContent;
  row.appendChild(link);

  const difficulty = document.createElement("div");
  difficulty.className = `leetcode-favorites-difficulty ${record.difficultyClass}`;
  difficulty.textContent = record.difficulty;
  row.appendChild(difficulty);

  groupEl.appendChild(row);
}

function renderGroup(root, groupName, list) {
  const groupEl = document.createElement("section");
  groupEl.className = "leetcode-favorites-group";

  const heading = document.createElement("div");
  heading.className = "leetcode-favorites-group-heading";

  const title = document.createElement("div");
  title.textContent = groupName;
  heading.appendChild(title);

  const count = document.createElement("div");
  count.className = "leetcode-favorites-group-count";
  count.textContent = `${list.length} 题`;
  heading.appendChild(count);

  groupEl.appendChild(heading);

  for (const record of list) {
    renderRecord(groupEl, record);
  }

  root.appendChild(groupEl);
}

const root = dv.el("div", "", {
  cls: "leetcode-favorites-root",
});

const header = document.createElement("div");
header.className = "leetcode-favorites-header";

const titleWrap = document.createElement("div");
const title = document.createElement("div");
title.className = "leetcode-favorites-title";
title.textContent = "收藏题解";
titleWrap.appendChild(title);

const subtitle = document.createElement("div");
subtitle.className = "leetcode-favorites-subtitle";
subtitle.textContent = "已收藏的 LeetCode 题解";
titleWrap.appendChild(subtitle);

header.appendChild(titleWrap);

const actions = document.createElement("div");
actions.className = "leetcode-favorites-actions";
const backLink = document.createElement("a");
backLink.className = "internal-link";
backLink.href = pagePathInCurrentFolder("leetcode-statistics");
backLink.textContent = "返回统计";
actions.appendChild(backLink);
header.appendChild(actions);

root.appendChild(header);

const counts = {
  total: records.length,
  easy: records.filter(record => record.difficulty === "简单").length,
  medium: records.filter(record => record.difficulty === "中等").length,
  hard: records.filter(record => record.difficulty === "困难").length,
};

const summary = document.createElement("div");
summary.className = "leetcode-favorites-summary";
summary.appendChild(createSummaryCard("收藏总数", `${counts.total} 题`));
summary.appendChild(createSummaryCard("简单", `${counts.easy} 题`));
summary.appendChild(createSummaryCard("中等", `${counts.medium} 题`));
summary.appendChild(createSummaryCard("困难", `${counts.hard} 题`));
root.appendChild(summary);

if (!records.length) {
  const empty = document.createElement("div");
  empty.className = "leetcode-favorites-empty";
  empty.textContent = "还没有收藏题解。把题解笔记 frontmatter 中的 favorite 改为 true 后，这里会自动显示。";
  root.appendChild(empty);
} else {
  const groups = new Map();

  for (const record of records) {
    if (!groups.has(record.difficulty)) {
      groups.set(record.difficulty, []);
    }

    groups.get(record.difficulty).push(record);
  }

  for (const difficulty of ["困难", "中等", "简单", "未知"]) {
    const list = groups.get(difficulty) ?? [];
    if (list.length) {
      renderGroup(root, difficulty, list);
    }
  }
}
```
