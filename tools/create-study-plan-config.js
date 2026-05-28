#!/usr/bin/env node
/**
 * Generate a local Obsidian study-plan config from a public leetcode.cn study plan.
 *
 * Usage:
 *   node tools/create-study-plan-config.js https://leetcode.cn/studyplan/top-100-liked/ --target-date 2026-12-31 --plan-id hot100 --output-dir statistics/study-plans
 *   node tools/create-study-plan-config.js top-100-liked --stdout
 */

const fs = require("fs");
const path = require("path");

const API_URL = "https://leetcode.cn/graphql/";
const DEFAULT_TARGET_DATE = "2026-12-31";

const QUERY = `
query studyPlanV2Detail($slug: String!) {
  studyPlanV2Detail(planSlug: $slug) {
    name
    slug
    questionNum
    planSubGroups {
      name
      questions {
        titleSlug
        title
        translatedTitle
        questionFrontendId
        difficulty
      }
    }
  }
}
`;

function printHelp() {
    console.log(`
Generate a local LeetCode study-plan config for Obsidian Dataview.

Usage:
  node tools/create-study-plan-config.js <study-plan-url-or-slug> [options]

Options:
  --target-date <YYYY-MM-DD>  Target completion date. Default: ${DEFAULT_TARGET_DATE}
  --output <path>             Write markdown config to this file.
  --output-dir <dir>          Write to <dir>/<plan-id>.md.
  --stdout                    Print markdown config to stdout. This is the default.
  --plan-id <id>              Override frontmatter plan_id. Default: plan slug.
  --help                      Show this help.

Examples:
  node tools/create-study-plan-config.js https://leetcode.cn/studyplan/top-100-liked/ --target-date 2026-12-31 --plan-id hot100 --output-dir statistics/study-plans
  node tools/create-study-plan-config.js top-100-liked --plan-id hot100 --stdout
`.trim());
}

function parseArgs(argv) {
    const options = {
        targetDate: DEFAULT_TARGET_DATE,
        output: "",
        outputDir: "",
        stdout: false,
        planId: "",
        input: "",
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--help" || arg === "-h") {
            options.help = true;
            continue;
        }

        if (arg === "--stdout") {
            options.stdout = true;
            continue;
        }

        if (arg === "--target-date") {
            options.targetDate = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg === "--output") {
            options.output = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg === "--output-dir") {
            options.outputDir = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg === "--plan-id") {
            options.planId = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg.startsWith("--")) {
            throw new Error(`Unknown option: ${arg}`);
        }

        if (!options.input) {
            options.input = arg;
            continue;
        }

        throw new Error(`Unexpected argument: ${arg}`);
    }

    return options;
}

function readFlagValue(argv, index, flag) {
    const value = argv[index];

    if (!value || value.startsWith("--")) {
        throw new Error(`${flag} requires a value.`);
    }

    return value;
}

function extractPlanSlug(input) {
    const text = String(input || "").trim();
    if (!text) return "";

    const urlMatch = text.match(/leetcode\.cn\/studyplan\/([^/?#]+)/i);
    if (urlMatch) return urlMatch[1];

    const pathMatch = text.match(/\/studyplan\/([^/?#]+)/i);
    if (pathMatch) return pathMatch[1];

    return text.replace(/^\/+|\/+$/g, "");
}

function normalizeDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (!match) {
        throw new Error(`Invalid --target-date "${value}". Expected YYYY-MM-DD.`);
    }

    return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

async function fetchStudyPlan(slug) {
    if (typeof fetch !== "function") {
        throw new Error("This script requires Node.js 18+ because it uses the built-in fetch API.");
    }

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Origin": "https://leetcode.cn",
            "Referer": `https://leetcode.cn/studyplan/${slug}/`,
            "User-Agent": "leetcode-to-obsidian-study-plan-exporter",
        },
        body: JSON.stringify({
            operationName: "studyPlanV2Detail",
            variables: { slug },
            query: QUERY,
        }),
    });

    if (!response.ok) {
        throw new Error(`LeetCode GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();

    if (payload.errors && payload.errors.length) {
        throw new Error(`LeetCode GraphQL error: ${payload.errors.map(error => error.message).join("; ")}`);
    }

    const plan = payload?.data?.studyPlanV2Detail;

    if (!plan) {
        throw new Error(`No study plan found for slug "${slug}".`);
    }

    return plan;
}

function flattenProblems(plan) {
    const seen = new Set();
    const problems = [];

    for (const group of plan.planSubGroups || []) {
        for (const question of group.questions || []) {
            const slug = String(question.titleSlug || "").trim();
            const id = String(question.questionFrontendId || "").trim();
            const key = slug || id;

            if (!key || seen.has(key)) continue;
            seen.add(key);

            problems.push({
                id,
                slug,
                title: String(question.translatedTitle || question.title || slug || id).trim(),
                difficulty: String(question.difficulty || "").trim(),
                group: String(group.name || "").trim(),
            });
        }
    }

    return problems;
}

function yamlScalar(value) {
    const text = String(value ?? "");

    if (/^[A-Za-z0-9._:/?#=&%-]+$/.test(text)) {
        return text;
    }

    return JSON.stringify(text);
}

function safeFileName(value) {
    const text = String(value || "study-plan")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return text || "study-plan";
}

function renderConfig({ plan, problems, targetDate, sourceUrl, planId }) {
    const lines = [
        "---",
        "type: leetcode-study-plan-config",
        `plan_id: ${yamlScalar(planId || plan.slug)}`,
        `plan_name: ${yamlScalar(plan.name || plan.slug)}`,
        `target_date: ${targetDate}`,
        `source_url: ${sourceUrl}`,
        "problems:",
    ];

    for (const problem of problems) {
        lines.push(`  - id: ${yamlScalar(problem.id)}`);
        lines.push(`    slug: ${yamlScalar(problem.slug)}`);
        lines.push(`    title: ${yamlScalar(problem.title)}`);
        lines.push(`    difficulty: ${yamlScalar(problem.difficulty)}`);
        lines.push(`    group: ${yamlScalar(problem.group)}`);
    }

    lines.push("---");
    lines.push("");
    lines.push(`# ${plan.name || plan.slug} 题单配置`);
    lines.push("");
    lines.push("把这个文件放在 `leetcode-statistics.md` 同目录或子目录中。修改 `target_date` 可以调整目标完成日期；切换当前题单请修改 `leetcode-study-plan-current.md` 的 `active_plan_id`，或运行 `tools/switch-study-plan.js`。");

    return `${lines.join("\n")}\n`;
}

function writeOutput(filePath, content) {
    const resolved = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, "utf8");
    return resolved;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    const slug = extractPlanSlug(options.input);

    if (!slug) {
        printHelp();
        process.exitCode = 1;
        return;
    }

    const targetDate = normalizeDate(options.targetDate);
    const sourceUrl = `https://leetcode.cn/studyplan/${slug}/`;
    const plan = await fetchStudyPlan(slug);
    const problems = flattenProblems(plan);

    if (!problems.length) {
        throw new Error(`Study plan "${slug}" did not return any questions.`);
    }

    const planId = options.planId || plan.slug || slug;
    const content = renderConfig({
        plan,
        problems,
        targetDate,
        sourceUrl,
        planId,
    });

    if ((options.output || options.outputDir) && !options.stdout) {
        const outputPath = options.output || path.join(options.outputDir, `${safeFileName(planId)}.md`);
        const resolved = writeOutput(outputPath, content);
        console.error(`Wrote ${problems.length} problems to ${resolved}`);
        return;
    }

    process.stdout.write(content);
}

main().catch(error => {
    console.error(`[create-study-plan-config] ${error.message}`);
    process.exitCode = 1;
});
