/**
 * LeetCode CN Problem Fetcher for Obsidian QuickAdd
 *
 * 功能：
 * 1. 优先从剪贴板读取 Tampermonkey 复制的 LeetCode payload：
 *    {
 *      "type": "leetcode-cn-obsidian",
 *      "url": "https://leetcode.cn/problems/two-sum/",
 *      "titleSlug": "two-sum",
 *      "language": "cpp",
 *      "code": "class Solution { ... }",
 *      "doneDate": "2026-05-23" // 可选；不提供时脚本自动使用当天日期
 *    }
 *
 * 2. 如果剪贴板没有有效 payload，则退回手动模式：
 *    - 输入 LeetCode URL / slug
 *    - 手动粘贴代码
 *
 * 3. 从 leetcode.cn/graphql/ 拉取中文题目：
 *    - translatedTitle
 *    - translatedContent
 *    - translatedName
 *
 * 4. 设置 QuickAdd 模板变量：
 *    {{VALUE:id}}
 *    {{VALUE:title}}
 *    {{VALUE:link}}
 *    {{VALUE:difficulty}}
 *    {{VALUE:problemStatement}}
 *    {{VALUE:formattedHints}}
 *    {{VALUE:tags}}
 *    {{VALUE:fileName}}
 *    {{VALUE:language}}
 *    {{VALUE:solutionCode}}
 *    {{VALUE:sourceUrl}}
 *    {{VALUE:titleSlug}}
 *    {{VALUE:type}}
 *    {{VALUE:status}}
 *    {{VALUE:doneDate}}
 *    {{VALUE:createdAt}}
 *    {{VALUE:lcId}}
 *    {{VALUE:difficultyRaw}}
 */

// ==============================
// 工具函数：通知与日志
// ==============================

const notice = (msg) => new Notice(msg, 5000);
const log = (msg) => console.log("[LeetCode QuickAdd]", msg);

// ==============================
// 常量
// ==============================

const API_URL = "https://leetcode.cn/graphql/";
const TAG_PREFIX_SETTING = "LeetCode Tag Prefix";

// ==============================
// QuickAdd 模块配置
// ==============================

module.exports = {
    entry: start,
    settings: {
        name: "LeetCode Puller CN",
        author: "Shane Zimmerman / Modified for LeetCode CN + Clipboard Code",
        options: {
            [TAG_PREFIX_SETTING]: {
                type: "text",
                defaultValue: "leetcode/",
                placeholder: "Enter tag prefix, e.g. leetcode/",
                description: "Prefix to be added to LeetCode tags.",
            },
        },
    },
};

// ==============================
// 全局变量
// ==============================

let QuickAdd;
let Settings;

// ==============================
// 主入口
// ==============================

async function start(params, settings) {
    QuickAdd = params;
    Settings = settings || {};

    let context = await getProblemContext();

    if (!context || !context.titleSlug) {
        notice("没有识别到 LeetCode 题目 slug。");
        return;
    }

    const problemData = await getLeetCodeProblem(context.titleSlug);

    if (!problemData) {
        notice("获取题目信息失败。");
        return;
    }

    setQuickAddVariables(problemData, context);

    notice(`已准备生成题目笔记：${problemData.id}. ${problemData.title}`);
}

/**
 * 获取题目上下文。
 *
 * 优先级：
 * 1. 从剪贴板读取 Tampermonkey payload
 * 2. 手动输入 URL / slug
 * 3. 手动粘贴代码
 */
async function getProblemContext() {
    const payload = await readLeetCodePayloadFromClipboard();

    if (payload) {
        const titleSlug = payload.titleSlug || extractTitleSlug(payload.url);
        const language = normalizeMarkdownLanguage(payload.language || "cpp");
        const solutionCode = payload.code || "";
        const sourceUrl = payload.url || `https://leetcode.cn/problems/${titleSlug}/`;
        const doneDate = normalizeDateValue(payload.doneDate || payload.done_date || payload.date) || getTodayLocalDate();
        const createdAt = normalizeDateTimeValue(payload.createdAt || payload.created_at || payload.datetime) || getNowLocalDateTime();

        notice("已从剪贴板读取 LeetCode 代码。");

        return {
            titleSlug,
            sourceUrl,
            language,
            solutionCode,
            doneDate,
            createdAt,
            fromClipboard: true,
        };
    }

    notice("剪贴板中没有有效的 LeetCode payload，进入手动模式。");

    const input = await promptForInput();
    if (!input) return null;

    const manualPayload = parseLeetCodePayloadText(input);

    if (manualPayload) {
        const titleSlug = manualPayload.titleSlug || extractTitleSlug(manualPayload.url);
        return {
            titleSlug,
            sourceUrl: manualPayload.url || `https://leetcode.cn/problems/${titleSlug}/`,
            language: normalizeMarkdownLanguage(manualPayload.language || "cpp"),
            solutionCode: manualPayload.code || "",
            doneDate: normalizeDateValue(manualPayload.doneDate || manualPayload.done_date || manualPayload.date) || getTodayLocalDate(),
            createdAt: normalizeDateTimeValue(manualPayload.createdAt || manualPayload.created_at || manualPayload.datetime) || getNowLocalDateTime(),
            fromClipboard: false,
        };
    }

    const titleSlug = extractTitleSlug(input);
    if (!titleSlug) return null;

    const solutionCode = await promptForSolutionCode();

    return {
        titleSlug,
        sourceUrl: input.startsWith("http")
            ? input
            : `https://leetcode.cn/problems/${titleSlug}/`,
        language: "cpp",
        solutionCode: solutionCode || "",
        doneDate: getTodayLocalDate(),
        createdAt: getNowLocalDateTime(),
        fromClipboard: false,
    };
}

// ==============================
// 输入相关
// ==============================

async function promptForInput() {
    const input = await QuickAdd.quickAddApi.inputPrompt(
        "输入 LeetCode 题目链接或 title slug：",
        "例如：https://leetcode.cn/problems/two-sum/ 或 two-sum"
    );

    if (!input || !input.trim()) {
        notice("没有输入题目链接或 slug。");
        return null;
    }

    return input.trim();
}

async function promptForSolutionCode() {
    const api = QuickAdd.quickAddApi;

    let pasted = "";

    if (typeof api.wideInputPrompt === "function") {
        pasted = await api.wideInputPrompt(
            "粘贴你的代码或 Tampermonkey JSON",
            "可以直接粘贴 C++ 代码；如果粘贴的是 Tampermonkey 复制的 JSON，脚本会自动提取其中的 code 字段。"
        );
    } else {
        pasted = await api.inputPrompt(
            "粘贴你的代码或 Tampermonkey JSON",
            "当前 QuickAdd 版本可能不支持多行输入。"
        );
    }

    if (!pasted) {
        return "";
    }

    const parsed = parseLeetCodePayloadText(pasted);

    if (parsed && parsed.code) {
        return normalizeSolutionCode(parsed.code);
    }

    return normalizeSolutionCode(pasted);
}

function parseLeetCodePayloadText(text) {
    if (!text || !text.trim()) {
        return null;
    }

    try {
        const payload = JSON.parse(text.trim());

        if (payload && payload.type === "leetcode-cn-obsidian") {
            return payload;
        }

        return null;
    } catch {
        return null;
    }
}

// ==============================
// 剪贴板 payload
// ==============================

async function readLeetCodePayloadFromClipboard() {
    try {
        if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
            log("navigator.clipboard.readText 不可用。");
            return null;
        }

        const text = await navigator.clipboard.readText();

        if (!text || !text.trim()) {
            return null;
        }

        let payload;
        try {
            payload = JSON.parse(text);
        } catch {
            return null;
        }

        if (!payload || payload.type !== "leetcode-cn-obsidian") {
            return null;
        }

        if (!payload.titleSlug && !payload.url) {
            return null;
        }

        return payload;
    } catch (error) {
        console.warn("[LeetCode QuickAdd] 剪贴板读取失败：", error);
        return null;
    }
}

// ==============================
// slug / 语言处理
// ==============================

function extractTitleSlug(input) {
    if (!input) return "";

    const text = input.trim();

    const match = text.match(/leetcode\.(com|cn)\/problems\/([^/?#]+)/);
    if (match) {
        return match[2];
    }

    const pathMatch = text.match(/\/problems\/([^/?#]+)/);
    if (pathMatch) {
        return pathMatch[1];
    }

    return text.replace(/^\/+|\/+$/g, "");
}

function normalizeMarkdownLanguage(language) {
    if (!language) return "cpp";

    const lower = String(language).toLowerCase();

    const map = {
        "c++": "cpp",
        cpp: "cpp",
        cplusplus: "cpp",
        "python3": "python",
        python: "python",
        java: "java",
        javascript: "javascript",
        typescript: "typescript",
        go: "go",
        golang: "go",
        rust: "rust",
        c: "c",
        "c#": "csharp",
        csharp: "csharp",
        kotlin: "kotlin",
        swift: "swift",
        ruby: "ruby",
        scala: "scala",
        php: "php",
    };

    return map[lower] || lower;
}

function translateDifficulty(difficulty) {
    const map = {
        Easy: "简单",
        Medium: "中等",
        Hard: "困难",
    };

    return map[difficulty] || difficulty;
}

// ==============================
// 请求 LeetCode CN GraphQL
// ==============================

async function getLeetCodeProblem(titleSlug) {
    try {
        const body = JSON.stringify({
            operationName: "questionData",
            variables: {
                titleSlug,
            },
            query: `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    translatedTitle
    content
    translatedContent
    difficulty
    hints
    topicTags {
      name
      slug
      translatedName
    }
  }
}
            `,
        });

        const response = await request({
            url: API_URL,
            method: "POST",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                Referer: `https://leetcode.cn/problems/${titleSlug}/`,
                Origin: "https://leetcode.cn",
            },
            body,
        });

        const data = JSON.parse(response);

        if (!data.data || !data.data.question) {
            notice("没有从力扣中国站获取到题目信息。");
            return null;
        }

        const q = data.data.question;

        return {
            id: q.questionFrontendId || q.questionId || "",
            title: q.translatedTitle || q.title || "",
            titleSlug: q.titleSlug || titleSlug,
            difficulty: translateDifficulty(q.difficulty || ""),
            difficultyRaw: q.difficulty || "",
            link: `https://leetcode.cn/problems/${titleSlug}/`,
            topicTags: q.topicTags || [],
            problemStatement: formatProblemStatement(q.translatedContent || q.content || ""),
            hints: q.hints || [],
        };
    } catch (error) {
        console.error("[LeetCode QuickAdd] 获取力扣中国站题目失败：", error);
        notice("从力扣中国站获取题目失败。");
        return null;
    }
}

// ==============================
// 设置 QuickAdd 变量
// ==============================

function setQuickAddVariables(problemData, context) {
    const doneDate = context.doneDate || getTodayLocalDate();
    const createdAt = context.createdAt || getNowLocalDateTime();

    QuickAdd.variables = {
        ...problemData,

        // Dataview / DataviewJS 统计核心字段。
        type: "leetcode",
        status: "done",
        doneDate,
        createdAt,
        lcId: problemData.id || "",

        fileName: `${problemData.id}. ${replaceIllegalFileNameCharactersInString(problemData.title)}`,

        difficultyLink: `[[${problemData.difficulty}]]`,

        tags: formatTags(problemData.topicTags),

        formattedHints: formatHints(problemData.hints),

        language: context.language || "cpp",

        solutionCode: normalizeSolutionCode(context.solutionCode || ""),

        sourceUrl: context.sourceUrl || problemData.link,

        titleSlug: context.titleSlug || problemData.titleSlug || "",
    };
}

// ==============================
// HTML → Markdown
// ==============================

function formatProblemStatement(html) {
    if (!html) return "";

    const root = document.createElement("div");
    root.innerHTML = html;

    const children = getSignificantChildren(root);
    const blocks = [];
    let exampleCount = 1;

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (node.nodeType === 3) {
            const text = cleanupBlockText(node.textContent || "");
            if (text) blocks.push(text);
            continue;
        }

        if (node.nodeType !== 1) continue;

        const tag = node.tagName.toLowerCase();
        const markerText = normalizeMarkerText(node.textContent || "");

        // 示例标题：<p><strong>示例 1：</strong></p>
        if (tag === "p" && /^示例\s*\d+\s*[：:]?$/.test(markerText)) {
            const nextIndex = findNextSignificantIndex(children, i + 1);
            const nextNode = nextIndex >= 0 ? children[nextIndex] : null;

            if (nextNode && nextNode.nodeType === 1 && nextNode.tagName.toLowerCase() === "pre") {
                blocks.push(formatPreAsExample(nextNode, exampleCount));
                exampleCount++;
                i = nextIndex;
                continue;
            }

            blocks.push(`>[!Example]+ 示例 ${exampleCount}`);
            exampleCount++;
            continue;
        }

        // 约束条件标题：<p><strong>提示：</strong></p>
        if (tag === "p" && /^提示\s*[：:]?$/.test(markerText)) {
            const nextIndex = findNextSignificantIndex(children, i + 1);
            const nextNode = nextIndex >= 0 ? children[nextIndex] : null;

            if (
                nextNode &&
                nextNode.nodeType === 1 &&
                ["ul", "ol"].includes(nextNode.tagName.toLowerCase())
            ) {
                blocks.push(formatConstraintsList(nextNode));
                i = nextIndex;
                continue;
            }

            blocks.push(`>[!warning]+ 约束条件`);
            continue;
        }

        // 进阶
        if (tag === "p" && /^进阶\s*[：:]?/.test(markerText)) {
            const followUp = markerText.replace(/^进阶\s*[：:]?\s*/, "").trim();

            if (followUp) {
                blocks.push(`>[!Todo]- 进阶\n>${followUp}`);
            } else {
                blocks.push(`>[!Todo]- 进阶`);
            }

            continue;
        }

        // 独立 pre：通常也是示例
        if (tag === "pre") {
            const raw = normalizePreText(node.textContent || "");

            if (/输入\s*[：:]|输出\s*[：:]|解释\s*[：:]/.test(raw)) {
                blocks.push(formatPreAsExample(node, exampleCount));
                exampleCount++;
            } else {
                blocks.push(`\`\`\`text\n${raw}\n\`\`\``);
            }

            continue;
        }

        // 普通列表
        if (tag === "ul" || tag === "ol") {
            const listMarkdown = renderList(node);
            if (listMarkdown) blocks.push(listMarkdown);
            continue;
        }

        // 普通段落
        if (tag === "p") {
            const paragraph = cleanupBlockText(renderInline(node));
            if (paragraph) blocks.push(paragraph);
            continue;
        }

        // 图片或其他节点兜底
        const rendered = cleanupBlockText(renderInline(node));
        if (rendered) blocks.push(rendered);
    }

    return blocks
        .join("\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function getSignificantChildren(element) {
    return Array.from(element.childNodes).filter((node) => {
        if (node.nodeType === 3) {
            return Boolean((node.textContent || "").trim());
        }

        if (node.nodeType === 1) {
            return Boolean((node.textContent || "").trim()) || node.tagName.toLowerCase() === "img";
        }

        return false;
    });
}

function findNextSignificantIndex(nodes, start) {
    for (let i = start; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.nodeType === 3 && !(node.textContent || "").trim()) {
            continue;
        }

        return i;
    }

    return -1;
}

function renderInline(node) {
    if (!node) return "";

    if (node.nodeType === 3) {
        return node.textContent || "";
    }

    if (node.nodeType !== 1) {
        return "";
    }

    const tag = node.tagName.toLowerCase();

    if (tag === "br") {
        return "\n";
    }

    if (tag === "code") {
        return `\`${cleanupInlineCode(node.textContent || "")}\``;
    }

    if (tag === "strong" || tag === "b") {
        const text = renderChildrenInline(node).trim();
        return text ? `**${text}**` : "";
    }

    if (tag === "em" || tag === "i") {
        const text = renderChildrenInline(node).trim();
        return text ? `*${text}*` : "";
    }

    if (tag === "sup") {
        return `^${(node.textContent || "").trim()}`;
    }

    if (tag === "img") {
        const src = node.getAttribute("src") || "";
        return src ? `![](${src})` : "";
    }

    if (tag === "a") {
        const text = renderChildrenInline(node).trim();
        const href = node.getAttribute("href") || "";

        if (text && href) {
            return `[${text}](${href})`;
        }

        return text;
    }

    return renderChildrenInline(node);
}

function renderChildrenInline(node) {
    return Array.from(node.childNodes).map(renderInline).join("");
}

function renderList(listEl, level = 0) {
    const isOrdered = listEl.tagName.toLowerCase() === "ol";
    const items = Array.from(listEl.children).filter(
        (child) => child.tagName && child.tagName.toLowerCase() === "li"
    );

    return items
        .map((li, index) => {
            const marker = isOrdered ? `${index + 1}.` : "-";
            const indent = "  ".repeat(level);

            const nestedLists = Array.from(li.children).filter((child) =>
                ["ul", "ol"].includes(child.tagName.toLowerCase())
            );

            const inlineParts = Array.from(li.childNodes)
                .filter((child) => {
                    if (child.nodeType !== 1) return true;
                    return !["ul", "ol"].includes(child.tagName.toLowerCase());
                })
                .map(renderInline)
                .join("");

            const currentLine = `${indent}${marker} ${cleanupBlockText(inlineParts)}`;

            const nestedMarkdown = nestedLists
                .map((nested) => renderList(nested, level + 1))
                .filter(Boolean)
                .join("\n");

            return nestedMarkdown ? `${currentLine}\n${nestedMarkdown}` : currentLine;
        })
        .join("\n");
}

function formatPreAsExample(preNode, exampleCount) {
    const raw = normalizePreText(preNode.textContent || "");

    const input = extractLabeledSection(raw, "输入", ["输出", "解释"]);
    const output = extractLabeledSection(raw, "输出", ["解释"]);
    const explanation = extractLabeledSection(raw, "解释", []);

    let result = `>[!Example]+ 示例 ${exampleCount}\n`;

    if (input) {
        result += `>**输入**：\`${normalizeExampleValue(input)}\`\n`;
    }

    if (output) {
        result += `>**输出**：\`${normalizeExampleValue(output)}\`\n`;
    }

    if (explanation) {
        result += `>**解释**：${cleanupBlockText(explanation)}\n`;
    }

    // 如果没有识别出输入/输出，就保留原始 pre 内容，避免丢失信息
    if (!input && !output && !explanation) {
        result += raw
            .split("\n")
            .map((line) => `>${line}`)
            .join("\n");
    }

    return result.trimEnd();
}

function extractLabeledSection(raw, label, nextLabels) {
    const labelRe = new RegExp(`${label}\\s*[：:]\\s*`);
    const startMatch = raw.match(labelRe);

    if (!startMatch || typeof startMatch.index !== "number") {
        return "";
    }

    const start = startMatch.index + startMatch[0].length;
    let end = raw.length;

    for (const nextLabel of nextLabels) {
        const nextRe = new RegExp(`\\s*${nextLabel}\\s*[：:]\\s*`);
        const rest = raw.slice(start);
        const nextMatch = rest.match(nextRe);

        if (nextMatch && typeof nextMatch.index === "number") {
            end = Math.min(end, start + nextMatch.index);
        }
    }

    return raw.slice(start, end).trim();
}

function formatConstraintsList(listNode) {
    const items = Array.from(listNode.querySelectorAll("li"))
        .map((li) => cleanupBlockText(renderInline(li)))
        .filter(Boolean);

    if (!items.length) {
        return `>[!warning]+ 约束条件`;
    }

    return [
        `>[!warning]+ 约束条件`,
        ...items.map((item) => `>${item}`),
    ].join("\n");
}

function normalizePreText(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
}

function normalizeMarkerText(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeExampleValue(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/`/g, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanupInlineCode(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/`/g, "\\`")
        .trim();
}

function cleanupBlockText(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ==============================
// 标签 / 提示
// ==============================

function formatTags(tags) {
    if (!tags || !Array.isArray(tags)) return "";

    const prefix = Settings[TAG_PREFIX_SETTING] || "";

    // 默认保留英文 slug，稳定，适合 Dataview 和跨工具同步。
    return tags
        .filter((tag) => tag && tag.slug)
        .map((tag) => `   - ${prefix}${tag.slug.trim()}`)
        .join("\n");
}

function formatHints(hints) {
    if (!hints || hints.length === 0) {
        return "暂无提示。";
    }

    return hints
        .map((hint, index) => {
            const text = stripHtmlTags(hint).replace(/\n/g, "\n>");
            return `>[!Hint]- 提示 ${index + 1}\n>${text}`;
        })
        .join("\n\n");
}


// ==============================
// 日期工具：用于 DataviewJS 统计
// ==============================

function getTodayLocalDate() {
    const now = new Date();
    return formatLocalDate(now);
}

function getNowLocalDateTime() {
    const now = new Date();
    return `${formatLocalDate(now)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

function formatLocalDate(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function normalizeDateValue(value) {
    if (!value) return "";

    const text = String(value).trim();
    if (!text) return "";

    // 已经是 YYYY-MM-DD。
    const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoDate) {
        return `${isoDate[1]}-${pad2(isoDate[2])}-${pad2(isoDate[3])}`;
    }

    // 兼容 YYYY/MM/DD、YYYY.MM.DD、YYYY年MM月DD日。
    const looseDate = text.match(/^(\d{4})[\/.年-](\d{1,2})[\/.月-](\d{1,2})/);
    if (looseDate) {
        return `${looseDate[1]}-${pad2(looseDate[2])}-${pad2(looseDate[3])}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        return formatLocalDate(parsed);
    }

    return "";
}

function normalizeDateTimeValue(value) {
    if (!value) return "";

    const text = String(value).trim();
    if (!text) return "";

    const datePart = normalizeDateValue(text);
    const timeMatch = text.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

    if (datePart && timeMatch) {
        return `${datePart} ${pad2(timeMatch[1])}:${pad2(timeMatch[2])}:${pad2(timeMatch[3] || 0)}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        return `${formatLocalDate(parsed)} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}`;
    }

    return datePart;
}

// ==============================
// 字符串工具
// ==============================

function stripHtmlTags(html) {
    return html ? html.replace(/<[^>]*>/g, "") : "";
}

function cleanupInlineText(text) {
    return String(text || "")
        .trim()
        .replace(/<\/?div>/g, "")
        .replace(/`+$/g, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function replaceIllegalFileNameCharactersInString(string) {
    return string ? string.replace(/[\\,#%&{}/*<>$'":@]/g, "") : "";
}

function normalizeSolutionCode(code) {
    if (!code) return "";

    let result = String(code);

    // 如果代码是被 JSON.stringify 过的字符串，例如：
    // "class Solution {\\npublic:\\n ... }"
    // 这里尝试再解析一次
    try {
        if (
            (result.startsWith('"') && result.endsWith('"')) ||
            result.includes("\\n") ||
            result.includes("\\t")
        ) {
            const parsed = JSON.parse(`"${result
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                }"`);

            result = parsed;
        }
    } catch {
        // 如果 JSON.parse 失败，走下面的手动替换
    }

    return result
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .trim();
}