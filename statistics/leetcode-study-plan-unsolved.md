```dataviewjs
// ==============================
// LeetCode Study Plan Unsolved Problems
// 适配目录：notes/leetcode
// ==============================

const LEETCODE_FOLDER = "notes/leetcode";
const STUDY_PLAN_CONFIG_FILE = "leetcode-study-plan-config";
const STUDY_PLAN_CURRENT_FILE = "leetcode-study-plan-current";
const STUDY_PLAN_CONFIG_TYPE = "leetcode-study-plan-config";
const STUDY_PLAN_CURRENT_TYPE = "leetcode-study-plan-current";
const LEETCODE_PROBLEM_BASE_URL = "https://leetcode.cn/problems/";

const pages = dv.pages()
  .where(p =>
    p.file.folder === LEETCODE_FOLDER &&
    !p.file.name.includes("统计") &&
    !p.file.name.includes("statistics") &&
    String(p.type ?? "").trim() === "leetcode" &&
    String(p.status ?? "").trim() === "done" &&
    p.done_date
  );

function normalizeSlug(value) {
  return String(value ?? "").trim();
}

function normalizeId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const numeric = Number(text);
  if (Number.isFinite(numeric)) return String(numeric);

  return text;
}

function normalizePlanId(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.array === "function") return value.array();
  return [value];
}

function sameText(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function isSameFolderOrChild(page, folder) {
  if (!folder) return true;
  return page.file.folder === folder || page.file.folder.startsWith(`${folder}/`);
}

function pagePathInCurrentFolder(fileName) {
  const currentFolder = dv.current()?.file?.folder ?? "";
  return currentFolder ? `${currentFolder}/${fileName}` : fileName;
}

function findStudyPlanCurrentPage() {
  const currentFolder = dv.current()?.file?.folder ?? "";
  const candidates = dv.pages()
    .where(p =>
      String(p.type ?? "").trim() === STUDY_PLAN_CURRENT_TYPE ||
      p.file.name === STUDY_PLAN_CURRENT_FILE
    )
    .array();

  return candidates.find(p =>
    p.file.folder === currentFolder &&
    p.file.name === STUDY_PLAN_CURRENT_FILE
  ) ?? candidates.find(p =>
    p.file.folder === currentFolder &&
    String(p.type ?? "").trim() === STUDY_PLAN_CURRENT_TYPE
  ) ?? candidates.find(p =>
    p.file.name === STUDY_PLAN_CURRENT_FILE
  ) ?? candidates[0] ?? null;
}

function findStudyPlanConfigPages() {
  const currentFolder = dv.current()?.file?.folder ?? "";
  const candidates = dv.pages()
    .where(p =>
      String(p.type ?? "").trim() === STUDY_PLAN_CONFIG_TYPE ||
      p.file.name === STUDY_PLAN_CONFIG_FILE
    )
    .array();
  const scoped = candidates.filter(p => isSameFolderOrChild(p, currentFolder));

  return (scoped.length ? scoped : candidates)
    .sort((a, b) => a.file.path.localeCompare(b.file.path));
}

function findStudyPlanSelection() {
  const currentPage = findStudyPlanCurrentPage();
  const activePlanId = normalizePlanId(
    currentPage?.active_plan_id ??
    currentPage?.activePlanId ??
    currentPage?.plan_id
  );
  const configs = findStudyPlanConfigPages();

  if (!configs.length) {
    return {
      configPage: null,
      activePlanId,
      configCount: 0,
      message: `未找到题单配置。请把 ${STUDY_PLAN_CONFIG_FILE}.md 或其他题单配置放到统计页同一文件夹。`,
    };
  }

  if (activePlanId) {
    const selected = configs.find(p =>
      sameText(p.plan_id, activePlanId) ||
      sameText(p.file.name, activePlanId)
    );

    return {
      configPage: selected ?? null,
      activePlanId,
      configCount: configs.length,
      message: selected
        ? ""
        : `当前题单 ${activePlanId} 不存在。可用题单：${configs.map(p => p.plan_id ?? p.file.name).join("、")}`,
    };
  }

  const selected = configs.find(p => p.file.name === STUDY_PLAN_CONFIG_FILE) ?? configs[0];

  return {
    configPage: selected,
    activePlanId: normalizePlanId(selected?.plan_id ?? selected?.file?.name),
    configCount: configs.length,
    message: configs.length > 1
      ? `未设置 ${STUDY_PLAN_CURRENT_FILE}.md，已默认显示 ${selected.plan_id ?? selected.file.name}。`
      : "",
  };
}

function normalizeStudyPlanProblems(rawProblems) {
  const seen = new Set();

  return asArray(rawProblems)
    .map(problem => {
      const id = normalizeId(problem?.id ?? problem?.lc_id ?? problem?.["leetcode-index"]);
      const slug = normalizeSlug(problem?.slug ?? problem?.title_slug ?? problem?.titleSlug);
      const title = String(problem?.title ?? slug ?? id ?? "").trim();
      const difficulty = String(problem?.difficulty ?? problem?.difficulty_raw ?? problem?.difficultyRaw ?? "").trim();
      const group = String(problem?.group ?? "未分类").trim() || "未分类";
      const key = slug ? `slug:${slug}` : id ? `id:${id}` : "";

      return { id, slug, title, difficulty, group, key };
    })
    .filter(problem => {
      if (!problem.key || seen.has(problem.key)) return false;
      seen.add(problem.key);
      return true;
    });
}

const records = pages
  .array()
  .map(p => ({
    idText: normalizeId(p.lc_id ?? p["leetcode-index"] ?? ""),
    titleSlug: normalizeSlug(p.title_slug ?? p.titleSlug ?? ""),
  }));

const solvedSlugSet = new Set(
  records.map(r => r.titleSlug).filter(Boolean)
);

const solvedIdSet = new Set(
  records.map(r => r.idText).filter(Boolean)
);

function isStudyPlanProblemSolved(problem) {
  if (problem.slug && solvedSlugSet.has(problem.slug)) return true;
  if (problem.id && solvedIdSet.has(problem.id)) return true;
  return false;
}

function problemUrl(problem) {
  return problem.slug ? `${LEETCODE_PROBLEM_BASE_URL}${problem.slug}/` : "";
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

function groupUnsolvedProblems(problems) {
  const groups = new Map();

  for (const problem of problems) {
    if (isStudyPlanProblemSolved(problem)) continue;

    if (!groups.has(problem.group)) {
      groups.set(problem.group, []);
    }

    groups.get(problem.group).push(problem);
  }

  return groups;
}

const style = document.createElement("style");
style.textContent = `
.leetcode-unsolved-root {
  margin: 1rem 0 1.5rem 0;
  padding: 18px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  background: var(--background-secondary);
}

.leetcode-unsolved-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.leetcode-unsolved-title {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 850;
}

.leetcode-unsolved-subtitle {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.leetcode-unsolved-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.leetcode-unsolved-actions a {
  color: var(--text-accent);
  font-size: 13px;
  white-space: nowrap;
}

.leetcode-unsolved-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.leetcode-unsolved-card {
  padding: 13px 15px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.leetcode-unsolved-card-label {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 5px;
}

.leetcode-unsolved-card-value {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 800;
}

.leetcode-unsolved-group {
  overflow: hidden;
  margin-top: 20px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 14px;
  background: var(--background-primary);
}

.leetcode-unsolved-group-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  font-size: 16px;
  font-weight: 760;
}

.leetcode-unsolved-group-count {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.leetcode-unsolved-row {
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

.leetcode-unsolved-row:hover {
  background: var(--background-secondary);
}

.leetcode-unsolved-row:last-child {
  border-bottom: none;
}

.leetcode-unsolved-status {
  width: 20px;
  height: 20px;
  border: 2px solid #22c55e;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #22c55e;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.leetcode-unsolved-title-link {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-normal);
  font-size: 16px;
  font-weight: 720;
  text-decoration: none;
}

.leetcode-unsolved-title-link:hover {
  color: var(--text-accent);
  text-decoration: none;
}

.leetcode-unsolved-difficulty {
  text-align: right;
  font-size: 16px;
  font-weight: 760;
  white-space: nowrap;
}

.leetcode-unsolved-difficulty.easy {
  color: #22c55e;
}

.leetcode-unsolved-difficulty.medium {
  color: #eab308;
}

.leetcode-unsolved-difficulty.hard {
  color: #ef4444;
}

.leetcode-unsolved-difficulty.unknown {
  color: var(--text-muted);
}

.leetcode-unsolved-empty {
  padding: 18px 16px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  line-height: 1.5;
}

@media (max-width: 700px) {
  .leetcode-unsolved-header,
  .leetcode-unsolved-actions {
    display: block;
  }

  .leetcode-unsolved-actions a {
    display: inline-block;
    margin-top: 8px;
    margin-right: 12px;
  }

  .leetcode-unsolved-summary {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .leetcode-unsolved-row {
    grid-template-columns: 26px minmax(0, 1fr) 52px;
    gap: 10px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .leetcode-unsolved-title-link {
    font-size: 14px;
  }

  .leetcode-unsolved-difficulty {
    font-size: 14px;
  }
}
`;
document.head.appendChild(style);

function createSummaryCard(label, value) {
  const card = document.createElement("div");
  card.className = "leetcode-unsolved-card";

  const labelEl = document.createElement("div");
  labelEl.className = "leetcode-unsolved-card-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "leetcode-unsolved-card-value";
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);

  return card;
}

function appendActions(header, selection) {
  const actions = document.createElement("div");
  actions.className = "leetcode-unsolved-actions";

  const backLink = document.createElement("a");
  backLink.className = "internal-link";
  backLink.href = pagePathInCurrentFolder("leetcode-statistics");
  backLink.textContent = "返回统计";
  actions.appendChild(backLink);

  if (selection.configPage?.source_url) {
    const sourceLink = document.createElement("a");
    sourceLink.href = String(selection.configPage.source_url);
    sourceLink.textContent = "打开题单";
    actions.appendChild(sourceLink);
  }

  header.appendChild(actions);
}

function renderProblemRow(groupEl, problem) {
  const row = document.createElement("div");
  row.className = "leetcode-unsolved-row";

  const status = document.createElement("span");
  status.className = "leetcode-unsolved-status";
  status.textContent = "›";
  row.appendChild(status);

  const title = document.createElement(problem.slug ? "a" : "div");
  title.className = "leetcode-unsolved-title-link";
  title.textContent = problem.title || problem.slug || problem.id || "未命名题目";
  title.title = title.textContent;

  const url = problemUrl(problem);
  if (url) {
    title.href = url;
  }

  row.appendChild(title);

  const difficulty = document.createElement("div");
  difficulty.className = `leetcode-unsolved-difficulty ${difficultyClass(problem.difficulty)}`;
  difficulty.textContent = difficultyLabel(problem.difficulty);
  row.appendChild(difficulty);

  groupEl.appendChild(row);
}

function renderGroup(root, groupName, list) {
  const groupEl = document.createElement("section");
  groupEl.className = "leetcode-unsolved-group";

  const heading = document.createElement("div");
  heading.className = "leetcode-unsolved-group-heading";

  const title = document.createElement("div");
  title.textContent = groupName;
  heading.appendChild(title);

  const count = document.createElement("div");
  count.className = "leetcode-unsolved-group-count";
  count.textContent = `${list.length} 题`;
  heading.appendChild(count);

  groupEl.appendChild(heading);

  for (const problem of list) {
    renderProblemRow(groupEl, problem);
  }

  root.appendChild(groupEl);
}

function renderEmpty(root, message) {
  const empty = document.createElement("div");
  empty.className = "leetcode-unsolved-empty";
  empty.textContent = message;
  root.appendChild(empty);
}

const selection = findStudyPlanSelection();
const root = dv.el("div", "", {
  cls: "leetcode-unsolved-root",
});

const header = document.createElement("div");
header.className = "leetcode-unsolved-header";

const titleWrap = document.createElement("div");
const title = document.createElement("div");
title.className = "leetcode-unsolved-title";
title.textContent = selection.configPage?.plan_name ?? "当前题单";
titleWrap.appendChild(title);

const subtitle = document.createElement("div");
subtitle.className = "leetcode-unsolved-subtitle";
subtitle.textContent = "未做题目";
titleWrap.appendChild(subtitle);

header.appendChild(titleWrap);
appendActions(header, selection);
root.appendChild(header);

if (!selection.configPage) {
  renderEmpty(root, selection.message);
} else {
  const problems = normalizeStudyPlanProblems(selection.configPage.problems);
  const unsolvedGroups = groupUnsolvedProblems(problems);
  const unsolvedCount = Array.from(unsolvedGroups.values())
    .reduce((sum, list) => sum + list.length, 0);
  const solvedCount = problems.length - unsolvedCount;

  const summary = document.createElement("div");
  summary.className = "leetcode-unsolved-summary";
  summary.appendChild(createSummaryCard("未完成", `${unsolvedCount} 题`));
  summary.appendChild(createSummaryCard("已完成", `${solvedCount} 题`));
  summary.appendChild(createSummaryCard("题单总数", `${problems.length} 题`));
  root.appendChild(summary);

  if (selection.message) {
    renderEmpty(root, selection.message);
  }

  if (!unsolvedCount) {
    renderEmpty(root, "当前题单已经全部完成。");
  } else {
    for (const [groupName, list] of unsolvedGroups.entries()) {
      renderGroup(root, groupName, list);
    }
  }
}
```
