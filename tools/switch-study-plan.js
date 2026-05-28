#!/usr/bin/env node
/**
 * Switch the active local LeetCode study plan used by the Dataview statistics page.
 *
 * Usage:
 *   node tools/switch-study-plan.js --list --stats-dir statistics
 *   node tools/switch-study-plan.js hot100 --stats-dir statistics
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_STATS_DIR = "statistics";
const CURRENT_FILE_NAME = "leetcode-study-plan-current.md";

function printHelp() {
    console.log(`
Switch the active local LeetCode study plan.

Usage:
  node tools/switch-study-plan.js <plan-id> [options]
  node tools/switch-study-plan.js --list [options]

Options:
  --stats-dir <dir>      Folder containing leetcode-statistics.md. Default: ${DEFAULT_STATS_DIR}
  --current-file <path>  Override current selector file path.
  --list                 List available local study plans.
  --help                 Show this help.

Examples:
  node tools/switch-study-plan.js --list --stats-dir statistics
  node tools/switch-study-plan.js hot100 --stats-dir statistics
`.trim());
}

function parseArgs(argv) {
    const options = {
        statsDir: DEFAULT_STATS_DIR,
        currentFile: "",
        list: false,
        planId: "",
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--help" || arg === "-h") {
            options.help = true;
            continue;
        }

        if (arg === "--list") {
            options.list = true;
            continue;
        }

        if (arg === "--stats-dir") {
            options.statsDir = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg === "--current-file") {
            options.currentFile = readFlagValue(argv, ++i, arg);
            continue;
        }

        if (arg.startsWith("--")) {
            throw new Error(`Unknown option: ${arg}`);
        }

        if (!options.planId) {
            options.planId = arg;
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

function walkMarkdownFiles(rootDir) {
    const result = [];
    const resolvedRoot = path.resolve(rootDir);

    if (!fs.existsSync(resolvedRoot)) return result;

    const stack = [resolvedRoot];

    while (stack.length) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);

            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }

            if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
                result.push(fullPath);
            }
        }
    }

    return result.sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(content) {
    const match = String(content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const data = {};

    for (const line of match[1].split(/\r?\n/)) {
        const lineMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!lineMatch) continue;

        const key = lineMatch[1];
        let value = lineMatch[2].trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            try {
                value = JSON.parse(value);
            } catch {
                value = value.slice(1, -1);
            }
        }

        data[key] = value;
    }

    return data;
}

function findStudyPlans(statsDir) {
    return walkMarkdownFiles(statsDir)
        .map(filePath => {
            const content = fs.readFileSync(filePath, "utf8");
            const frontmatter = parseFrontmatter(content);

            if (String(frontmatter.type || "").trim() !== "leetcode-study-plan-config") {
                return null;
            }

            return {
                filePath,
                planId: String(frontmatter.plan_id || path.basename(filePath, ".md")).trim(),
                planName: String(frontmatter.plan_name || path.basename(filePath, ".md")).trim(),
                targetDate: String(frontmatter.target_date || "").trim(),
            };
        })
        .filter(Boolean);
}

function yamlScalar(value) {
    const text = String(value ?? "");

    if (/^[A-Za-z0-9._:/?#=&%-]+$/.test(text)) {
        return text;
    }

    return JSON.stringify(text);
}

function renderCurrentFile(plan) {
    return [
        "---",
        "type: leetcode-study-plan-current",
        `active_plan_id: ${yamlScalar(plan.planId)}`,
        "---",
        "",
        "# 当前 LeetCode 题单",
        "",
        `当前选择：${plan.planName} (${plan.planId})`,
        "",
        "统计页会读取 `active_plan_id`，并在同目录或子目录中查找 `type: leetcode-study-plan-config` 且 `plan_id` 相同的题单配置。",
        "",
    ].join("\n");
}

function writeCurrentFile(options, plan) {
    const currentPath = path.resolve(
        options.currentFile || path.join(options.statsDir, CURRENT_FILE_NAME)
    );

    fs.mkdirSync(path.dirname(currentPath), { recursive: true });
    fs.writeFileSync(currentPath, renderCurrentFile(plan), "utf8");
    return currentPath;
}

function printPlans(plans) {
    if (!plans.length) {
        console.log("No local study plans found.");
        return;
    }

    for (const plan of plans) {
        const target = plan.targetDate ? ` target=${plan.targetDate}` : "";
        console.log(`${plan.planId}\t${plan.planName}${target}\t${path.relative(process.cwd(), plan.filePath)}`);
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    const plans = findStudyPlans(options.statsDir);

    if (options.list) {
        printPlans(plans);
        return;
    }

    if (!options.planId) {
        printHelp();
        process.exitCode = 1;
        return;
    }

    const selected = plans.find(plan => plan.planId === options.planId);

    if (!selected) {
        console.error(`Study plan "${options.planId}" was not found in ${path.resolve(options.statsDir)}.`);
        printPlans(plans);
        process.exitCode = 1;
        return;
    }

    const currentPath = writeCurrentFile(options, selected);
    console.log(`Active study plan set to ${selected.planId} (${selected.planName}).`);
    console.log(`Updated ${currentPath}`);
}

try {
    main();
} catch (error) {
    console.error(`[switch-study-plan] ${error.message}`);
    process.exitCode = 1;
}
