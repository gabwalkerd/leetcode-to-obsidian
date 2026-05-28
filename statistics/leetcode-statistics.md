
```dataviewjs
// ==============================
// LeetCode DataviewJS Statistics
// 适配目录：notes/leetcode
// ==============================

const LEETCODE_FOLDER = "notes/leetcode";
const STUDY_PLAN_CONFIG_FILE = "leetcode-study-plan-config";
const STUDY_PLAN_CURRENT_FILE = "leetcode-study-plan-current";
const STUDY_PLAN_UNSOLVED_FILE = "leetcode-study-plan-unsolved";
const STUDY_PLAN_CONFIG_TYPE = "leetcode-study-plan-config";
const STUDY_PLAN_CURRENT_TYPE = "leetcode-study-plan-current";
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

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.array === "function") return value.array();
  return [value];
}

function normalizePlanId(value) {
  return String(value ?? "").trim();
}

function isSameFolderOrChild(page, folder) {
  if (!folder) return true;
  return page.file.folder === folder || page.file.folder.startsWith(`${folder}/`);
}

function sameText(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function pagePathInCurrentFolder(fileName) {
  const currentFolder = dv.current()?.file?.folder ?? "";
  return currentFolder ? `${currentFolder}/${fileName}` : fileName;
}

const records = pages
  .array()
  .map(p => ({
    page: p,
    date: formatDate(p.done_date),
    moment: toMoment(p.done_date),
    idText: normalizeId(p.lc_id ?? p["leetcode-index"] ?? ""),
    lcId: Number(p.lc_id ?? p["leetcode-index"] ?? 999999),
    title: p.title ?? p.file.name,
    titleSlug: normalizeSlug(p.title_slug ?? p.titleSlug ?? ""),
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

const solvedSlugSet = new Set(
  records.map(r => r.titleSlug).filter(Boolean)
);

const solvedIdSet = new Set(
  records.map(r => r.idText).filter(Boolean)
);

const monthCount = records.filter(r =>
  r.moment.isSameOrAfter(monthStart, "day")
).length;

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

  const activeByFlag = configs.find(p =>
    p.active === true ||
    String(p.status ?? "").trim().toLowerCase() === "active"
  );
  const selected = activeByFlag ?? configs.find(p => p.file.name === STUDY_PLAN_CONFIG_FILE) ?? configs[0];

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
      const group = String(problem?.group ?? "").trim();
      const key = slug ? `slug:${slug}` : id ? `id:${id}` : "";

      return { id, slug, title, group, key };
    })
    .filter(problem => {
      if (!problem.key || seen.has(problem.key)) return false;
      seen.add(problem.key);
      return true;
    });
}

function isStudyPlanProblemSolved(problem) {
  if (problem.slug && solvedSlugSet.has(problem.slug)) return true;
  if (problem.id && solvedIdSet.has(problem.id)) return true;
  return false;
}

function buildStudyPlanProgress(selection) {
  if (!selection.configPage) {
    return {
      state: "missing",
      planName: "当前题单",
      planId: selection.activePlanId || "",
      message: selection.message,
    };
  }

  const configPage = selection.configPage;
  const problems = normalizeStudyPlanProblems(configPage.problems);
  const completedProblems = problems.filter(isStudyPlanProblemSolved);
  const targetDate = formatDate(configPage.target_date);
  const targetMoment = targetDate !== "未知日期"
    ? window.moment(targetDate, "YYYY-MM-DD").startOf("day")
    : null;
  const hasValidTarget = Boolean(targetMoment?.isValid?.());
  const total = problems.length;
  const completed = completedProblems.length;
  const remaining = Math.max(total - completed, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const daysAvailable = hasValidTarget && targetMoment.isSameOrAfter(today, "day")
    ? targetMoment.diff(today, "days") + 1
    : 0;
  const dailyRequired = remaining === 0
    ? 0
    : daysAvailable > 0
      ? Math.ceil(remaining / daysAvailable)
      : null;

  let paceText = "未设置截止日期";
  if (remaining === 0 && total > 0) {
    paceText = "已完成";
  } else if (hasValidTarget && daysAvailable <= 0) {
    paceText = "已逾期";
  } else if (dailyRequired !== null) {
    paceText = `每天 ${dailyRequired} 题`;
  }

  return {
    state: total > 0 ? "ready" : "empty",
    planName: String(configPage.plan_name ?? configPage.file.name ?? "当前题单"),
    planId: String(configPage.plan_id ?? ""),
    sourceUrl: String(configPage.source_url ?? ""),
    targetDate: hasValidTarget ? targetDate : "未设置",
    total,
    completed,
    remaining,
    percent,
    daysAvailable,
    dailyRequired,
    paceText,
    selectionMessage: selection.message,
    configCount: selection.configCount,
    message: total > 0 ? "" : "题单配置中没有可统计的 problems。",
  };
}

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
const studyPlanProgress = buildStudyPlanProgress(findStudyPlanSelection());

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

.leetcode-study-plan {
  margin-bottom: 18px;
  padding: 14px 16px 16px 16px;
  border-radius: 14px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.leetcode-study-plan-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.leetcode-study-plan-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.leetcode-study-plan-subtitle {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.leetcode-study-plan-link {
  color: var(--text-accent);
  font-size: 13px;
  white-space: nowrap;
}

.leetcode-study-plan-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.leetcode-study-plan-progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.leetcode-study-plan-bar {
  flex: 1;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}

.leetcode-study-plan-bar-fill {
  height: 100%;
  min-width: 0;
  border-radius: 999px;
  background: var(--text-accent);
}

.leetcode-study-plan-percent {
  min-width: 48px;
  text-align: right;
  font-size: 18px;
  font-weight: 800;
}

.leetcode-study-plan-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(110px, 1fr));
  gap: 10px;
}

.leetcode-study-plan-metric {
  min-width: 0;
}

.leetcode-study-plan-metric-label {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 3px;
}

.leetcode-study-plan-metric-value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 700;
}

.leetcode-study-plan-empty {
  color: var(--text-muted);
  line-height: 1.5;
}

.leetcode-study-plan-note {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
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
  font-size: 16px;
  font-weight: 760;
  line-height: 1.35;
  margin-bottom: 12px;
}

.leetcode-detail-empty {
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 720;
}

.leetcode-detail-list {
  margin: 0;
  padding-left: 1.2rem;
}

.leetcode-detail-list li {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 720;
  line-height: 1.35;
}

.leetcode-detail-list .internal-link {
  color: var(--text-accent);
  font-size: 16px;
  font-weight: 720;
  text-decoration: none;
}

.leetcode-badge {
  display: inline-block;
  min-width: 38px;
  text-align: center;
  padding: 1px 8px;
  margin-left: 6px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 760;
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
  font-size: 1.35rem;
  line-height: 1.25;
  font-weight: 850;
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
  grid-template-columns: 132px minmax(220px, 1fr) 72px 56px;
  column-gap: 20px;
  align-items: center;
  min-height: 42px;
  padding: 6px 12px;
  box-sizing: border-box;
}

.leetcode-day-row.header {
  min-height: 44px;
  border-bottom: 2px solid var(--text-muted);
  color: var(--text-normal);
  font-size: 16px;
  font-weight: 760;
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
  font-size: 16px;
  font-weight: 720;
  line-height: 1.35;
}

.leetcode-day-cell.title,
.leetcode-day-cell.file {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.leetcode-day-cell.file .internal-link {
  display: inline-block;
  min-width: 32px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-accent);
  font-size: 16px;
  font-weight: 720;
}

.leetcode-difficulty {
  font-size: 16px;
  font-weight: 760;
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
  .leetcode-study-plan-metrics {
    grid-template-columns: repeat(3, minmax(110px, 1fr));
  }

  .leetcode-day-row {
    grid-template-columns: 96px minmax(160px, 1fr) 64px 48px;
    column-gap: 14px;
  }
}

@media (max-width: 700px) {
  .leetcode-summary {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .leetcode-study-plan-header,
  .leetcode-study-plan-progress-row {
    display: block;
  }

  .leetcode-study-plan-link {
    display: inline-block;
    margin-top: 8px;
    white-space: normal;
  }

  .leetcode-study-plan-actions {
    display: block;
  }

  .leetcode-study-plan-percent {
    margin-top: 8px;
    text-align: left;
  }

  .leetcode-study-plan-metrics {
    grid-template-columns: repeat(2, minmax(110px, 1fr));
  }

  .leetcode-day-row {
    grid-template-columns: 64px minmax(96px, 1fr) 52px 36px;
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

function createStudyPlanMetric(label, value) {
  const metric = document.createElement("div");
  metric.className = "leetcode-study-plan-metric";

  const labelEl = document.createElement("div");
  labelEl.className = "leetcode-study-plan-metric-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "leetcode-study-plan-metric-value";
  valueEl.textContent = value;
  valueEl.title = value;

  metric.appendChild(labelEl);
  metric.appendChild(valueEl);

  return metric;
}

function createStudyPlanPanel(progress) {
  const panel = document.createElement("div");
  panel.className = "leetcode-study-plan";

  const header = document.createElement("div");
  header.className = "leetcode-study-plan-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "leetcode-study-plan-title";
  title.textContent = progress.planName;
  titleWrap.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "leetcode-study-plan-subtitle";
  subtitle.textContent = progress.state === "ready"
    ? `当前题单进度：${progress.completed}/${progress.total} 题`
    : "当前题单";
  titleWrap.appendChild(subtitle);
  header.appendChild(titleWrap);

  const actions = document.createElement("div");
  actions.className = "leetcode-study-plan-actions";

  const unsolvedLink = document.createElement("a");
  unsolvedLink.className = "leetcode-study-plan-link internal-link";
  unsolvedLink.href = pagePathInCurrentFolder(STUDY_PLAN_UNSOLVED_FILE);
  unsolvedLink.textContent = "未做题目";
  actions.appendChild(unsolvedLink);

  if (progress.sourceUrl) {
    const link = document.createElement("a");
    link.className = "leetcode-study-plan-link";
    link.href = progress.sourceUrl;
    link.textContent = "打开题单";
    actions.appendChild(link);
  }

  header.appendChild(actions);

  panel.appendChild(header);

  if (progress.state !== "ready") {
    const empty = document.createElement("div");
    empty.className = "leetcode-study-plan-empty";
    empty.textContent = progress.message;
    panel.appendChild(empty);
    return panel;
  }

  const progressRow = document.createElement("div");
  progressRow.className = "leetcode-study-plan-progress-row";

  const bar = document.createElement("div");
  bar.className = "leetcode-study-plan-bar";

  const fill = document.createElement("div");
  fill.className = "leetcode-study-plan-bar-fill";
  fill.style.width = `${Math.max(0, Math.min(progress.percent, 100))}%`;
  bar.appendChild(fill);
  progressRow.appendChild(bar);

  const percent = document.createElement("div");
  percent.className = "leetcode-study-plan-percent";
  percent.textContent = `${progress.percent}%`;
  progressRow.appendChild(percent);

  panel.appendChild(progressRow);

  const daysText = progress.remaining === 0
    ? "0 天"
    : progress.daysAvailable > 0
      ? `${progress.daysAvailable} 天`
      : progress.targetDate === "未设置"
        ? "未设置"
        : "已逾期";

  const metrics = document.createElement("div");
  metrics.className = "leetcode-study-plan-metrics";
  metrics.appendChild(createStudyPlanMetric("已完成", `${progress.completed}/${progress.total} 题`));
  metrics.appendChild(createStudyPlanMetric("剩余题目", `${progress.remaining} 题`));
  metrics.appendChild(createStudyPlanMetric("截止日期", progress.targetDate));
  metrics.appendChild(createStudyPlanMetric("剩余天数", daysText));
  metrics.appendChild(createStudyPlanMetric("建议节奏", progress.paceText));
  panel.appendChild(metrics);

  if (progress.selectionMessage) {
    const note = document.createElement("div");
    note.className = "leetcode-study-plan-note";
    note.textContent = progress.selectionMessage;
    panel.appendChild(note);
  }

  return panel;
}

summary.appendChild(createCard("总完成", totalCount, "题"));
summary.appendChild(createCard("本月解决", monthCount, "题"));
summary.appendChild(createCard("当前连续", currentStreak, "天"));
summary.appendChild(createCard("最长连续", longestStreak, "天"));

dashboard.appendChild(summary);
dashboard.appendChild(createStudyPlanPanel(studyPlanProgress));

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
      const fileText = item.lcId === 999999 ? "打开" : String(item.lcId);
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
