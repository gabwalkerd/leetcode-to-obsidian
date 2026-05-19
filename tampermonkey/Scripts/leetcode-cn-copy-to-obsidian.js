// ==UserScript==
// @name         LeetCode CN Copy to Obsidian
// @namespace    https://leetcode.cn/
// @version      0.6.0
// @description  Copy current LeetCode CN problem URL and full editor code to clipboard for Obsidian QuickAdd.
// @match        https://leetcode.cn/problems/*
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const BUTTON_ID = "copy-to-obsidian-btn";

    /**
     * 如果自动选择 model 仍然不准，可以手动指定 model index。
     * 默认 null 表示自动选择。
     *
     * 调试方式：
     * 打开浏览器控制台，执行：
     * __LC_OBSIDIAN_DEBUG_MODELS__()
     *
     * 看哪个 index 是完整代码，然后把这里改成对应数字。
     */
    const MODEL_INDEX_OVERRIDE = null;

    /**
     * 复制到 Obsidian 前是否对代码做简单格式化。
     *
     * 当前格式化策略是保守的：
     * - 所有语言：统一换行、清理行尾空白、压缩过多空行
     * - C++ 风格大括号语言：根据 { } 重新计算基础缩进
     * - 大括号语言：控制语句括号前补空格，常见运算符和逗号补空格
     * - C++：public/private/protected 顶格
     * - Python / Ruby 等缩进敏感或非大括号语言：只做空白清理
     */
    const FORMAT_CODE_BEFORE_COPY = true;
    const FORMAT_INDENT_SIZE = 4;

    function getMonaco() {
        return unsafeWindow.monaco || window.monaco;
    }

    function normalizeLanguage(lang) {
        if (!lang) return "cpp";

        const lower = String(lang).toLowerCase();

        const map = {
            "c++": "cpp",
            cpp: "cpp",
            cplusplus: "cpp",
            java: "java",
            python: "python",
            python3: "python",
            javascript: "javascript",
            typescript: "typescript",
            go: "go",
            golang: "go",
            rust: "rust",
            c: "c",
            csharp: "csharp",
            "c#": "csharp",
            kotlin: "kotlin",
            swift: "swift",
            ruby: "ruby",
            scala: "scala",
            php: "php",
        };

        return map[lower] || lower;
    }

    function getTitleSlugFromUrl() {
        const match = location.pathname.match(/\/problems\/([^/]+)/);
        return match ? match[1] : "";
    }

    function isLikelySolutionCode(text) {
        if (!text) return false;

        return (
            /class\s+Solution/.test(text) ||
            /def\s+\w+\s*\(/.test(text) ||
            /func\s+\w+\s*\(/.test(text) ||
            /impl\s+Solution/.test(text) ||
            /public\s+class\s+Solution/.test(text)
        );
    }

    function isLikelyCodeLanguage(languageId) {
        const lang = normalizeLanguage(languageId);

        return [
            "cpp",
            "java",
            "python",
            "javascript",
            "typescript",
            "go",
            "rust",
            "c",
            "csharp",
            "kotlin",
            "swift",
            "ruby",
            "scala",
            "php",
        ].includes(lang);
    }

    function scoreModel(model, index) {
        const value = model.getValue?.() || "";
        const languageId = model.getLanguageId?.() || "";
        const uri = model.uri?.toString?.() || "";

        let score = 0;

        if (isLikelyCodeLanguage(languageId)) score += 100;

        if (/class\s+Solution/.test(value)) score += 100;
        if (/public:/.test(value)) score += 30;
        if (/vector\s*</.test(value)) score += 20;
        if (/unordered_map\s*</.test(value)) score += 20;
        if (/return\s+/.test(value)) score += 20;

        if (/def\s+\w+\s*\(/.test(value)) score += 80;
        if (/func\s+\w+\s*\(/.test(value)) score += 80;
        if (/impl\s+Solution/.test(value)) score += 80;

        // 同样像代码时，选择更长的 model，避免复制到截断 model
        score += Math.min(value.length, 5000) / 10;

        // 排除明显不是代码的内容
        if (/^\s*\{[\s\S]*\}\s*$/.test(value) && !isLikelySolutionCode(value)) {
            score -= 100;
        }

        if (/^\s*\[[\s\S]*\]\s*$/.test(value) && !isLikelySolutionCode(value)) {
            score -= 100;
        }

        if (uri.includes("solution")) score += 30;
        if (uri.includes("leetcode")) score += 10;

        return {
            index,
            score,
            languageId,
            uri,
            length: value.length,
            value,
            preview: value.slice(0, 120),
            tail: value.slice(-120),
        };
    }

    function getCodeFromEditors() {
        const monaco = getMonaco();

        if (!monaco || !monaco.editor) {
            return null;
        }

        const getEditors = monaco.editor.getEditors;

        if (typeof getEditors !== "function") {
            return null;
        }

        const editors = getEditors.call(monaco.editor) || [];

        if (!editors.length) {
            return null;
        }

        const candidates = editors
            .map((editor, index) => {
                const model = editor.getModel?.();
                if (!model) return null;

                const info = scoreModel(model, index);

                return {
                    editor,
                    model,
                    ...info,
                };
            })
            .filter(Boolean)
            .filter((item) => item.value && item.value.trim().length > 0)
            .sort((a, b) => b.score - a.score);

        if (!candidates.length) {
            return null;
        }

        const best = candidates[0];

        console.log("[LeetCode Copy to Obsidian] selected editor:", {
            index: best.index,
            languageId: best.languageId,
            length: best.length,
            score: best.score,
            preview: best.preview,
            tail: best.tail,
        });

        return {
            code: best.value,
            language: normalizeLanguage(best.languageId),
        };
    }

    function getCodeFromModels() {
        const monaco = getMonaco();

        if (!monaco || !monaco.editor) {
            return null;
        }

        const models = monaco.editor.getModels?.() || [];

        if (!models.length) {
            return null;
        }

        if (
            MODEL_INDEX_OVERRIDE !== null &&
            models[MODEL_INDEX_OVERRIDE] &&
            models[MODEL_INDEX_OVERRIDE].getValue
        ) {
            const model = models[MODEL_INDEX_OVERRIDE];

            return {
                code: model.getValue(),
                language: normalizeLanguage(model.getLanguageId?.() || "cpp"),
            };
        }

        const candidates = models
            .map((model, index) => scoreModel(model, index))
            .filter((item) => item.value && item.value.trim().length > 0)
            .sort((a, b) => b.score - a.score);

        console.table(
            candidates.map((item) => ({
                index: item.index,
                score: item.score,
                languageId: item.languageId,
                length: item.length,
                preview: item.preview,
                tail: item.tail,
            }))
        );

        if (!candidates.length) {
            return null;
        }

        const best = candidates[0];

        console.log("[LeetCode Copy to Obsidian] selected model:", {
            index: best.index,
            languageId: best.languageId,
            length: best.length,
            score: best.score,
            preview: best.preview,
            tail: best.tail,
        });

        return {
            code: best.value,
            language: normalizeLanguage(best.languageId),
        };
    }

    function getCodeFallbackFromDom() {
        const textarea = document.querySelector(".monaco-editor textarea");

        if (!textarea || !textarea.value) {
            return null;
        }

        return {
            code: textarea.value,
            language: "cpp",
        };
    }

    function getCurrentSolution() {
        const fromEditors = getCodeFromEditors();

        if (fromEditors && fromEditors.code && fromEditors.code.trim()) {
            return fromEditors;
        }

        const fromModels = getCodeFromModels();

        if (fromModels && fromModels.code && fromModels.code.trim()) {
            return fromModels;
        }

        const fromDom = getCodeFallbackFromDom();

        if (fromDom && fromDom.code && fromDom.code.trim()) {
            return fromDom;
        }

        return {
            code: "",
            language: "cpp",
        };
    }

    function shouldUseBraceFormatter(language) {
        return [
            "cpp",
            "java",
            "javascript",
            "typescript",
            "go",
            "rust",
            "c",
            "csharp",
            "kotlin",
            "swift",
            "scala",
            "php",
        ].includes(normalizeLanguage(language));
    }

    function normalizeCodeWhitespace(code, language) {
        let result = String(code || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .map((line) => line.replace(/[ \t]+$/g, ""))
            .join("\n")
            .replace(/\n{4,}/g, "\n\n\n")
            .trim();

        // Python 对缩进敏感，这里只做低风险清理，不主动重排缩进。
        if (normalizeLanguage(language) === "python") {
            result = result.replace(/\t/g, "    ");
        }

        return result;
    }

    function stripLineForBraceCount(line) {
        return String(line || "")
            .replace(/\/\*.*?\*\//g, "")
            .replace(/\/\/.*$/g, "")
            .replace(/#.*$/g, "")
            .replace(/"(?:\\.|[^"\\])*"/g, '""')
            .replace(/'(?:\\.|[^'\\])*'/g, "''")
            .replace(/`(?:\\.|[^`\\])*`/g, "``");
    }

    function countChar(text, char) {
        return (String(text || "").match(new RegExp(`\\${char}`, "g")) || []).length;
    }

    function shouldUseBraceLanguageSyntaxSpacing(language) {
        return shouldUseBraceFormatter(language);
    }

    function protectStringLiterals(text) {
        const literals = [];
        const protectedText = String(text || "").replace(
            /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
            (match) => {
                const token = `__LC_OBSIDIAN_STRING_${literals.length}__`;
                literals.push(match);
                return token;
            }
        );

        return {
            text: protectedText,
            restore(value) {
                return String(value || "").replace(/__LC_OBSIDIAN_STRING_(\d+)__/g, (_, index) => {
                    return literals[Number(index)] || "";
                });
            },
        };
    }

    function splitInlineComment(line) {
        const protectedLine = protectStringLiterals(line);
        const commentIndex = protectedLine.text.indexOf("//");

        if (commentIndex < 0) {
            return {
                code: line,
                comment: "",
            };
        }

        return {
            code: protectedLine.restore(protectedLine.text.slice(0, commentIndex)).trimEnd(),
            comment: protectedLine.restore(protectedLine.text.slice(commentIndex)),
        };
    }

    function normalizeBraceLanguageOperatorSpacing(code) {
        let result = String(code || "");

        result = result.replace(/\b(if|for|while|switch|catch)\s*\(/g, "$1 (");
        result = result.replace(/,\s*/g, ", ");
        result = result.replace(/\s*(<=|>=|==|!=)\s*/g, " $1 ");
        result = result.replace(/([^<>=!+\-*/%&|^])\s*=\s*([^=])/g, "$1 = $2");

        // 只处理最常见的二元算术运算，避免改动指针、引用、模板等 C++ 语法。
        result = result.replace(/([A-Za-z0-9_\]\)])\s*([+\-*/%])\s*([A-Za-z0-9_(\[])/g, "$1 $2 $3");

        // 按用户偏好，++ / -- 与操作数之间保留空格。
        result = result
            .replace(/([A-Za-z0-9_\]\)])\s*(\+\+|--)/g, "$1 $2")
            .replace(/(\+\+|--)\s*([A-Za-z0-9_(\[])/g, "$1 $2");

        return result.replace(/\s{2,}/g, " ").trim();
    }

    function formatLineSyntax(line, language) {
        if (!shouldUseBraceLanguageSyntaxSpacing(language)) {
            return line;
        }

        if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) {
            return line.trim();
        }

        const parts = splitInlineComment(line);
        const protectedCode = protectStringLiterals(parts.code);
        const formattedCode = protectedCode.restore(
            normalizeBraceLanguageOperatorSpacing(protectedCode.text)
        );

        if (!parts.comment) {
            return formattedCode;
        }

        if (!formattedCode) {
            return parts.comment.trim();
        }

        return `${formattedCode} ${parts.comment.trim()}`;
    }

    function formatBraceBasedCode(code, language) {
        const normalized = normalizeCodeWhitespace(code, language);
        const lines = normalized.split("\n");
        const indentUnit = " ".repeat(FORMAT_INDENT_SIZE);
        let indentLevel = 0;

        return lines
            .map((line) => {
                const trimmed = line.trim();

                if (!trimmed) {
                    return "";
                }

                // C/C++ 预处理指令通常保持顶格，更符合工具链和阅读习惯。
                if (trimmed.startsWith("#") && ["c", "cpp"].includes(normalizeLanguage(language))) {
                    return trimmed;
                }

                const braceScanText = stripLineForBraceCount(trimmed);
                const leadingCloseBraces = (braceScanText.match(/^}+/) || [""])[0].length;
                const currentIndentLevel = Math.max(indentLevel - leadingCloseBraces, 0);
                const lineIndentLevel = /^(public|private|protected)\s*:\s*$/.test(trimmed)
                    ? Math.max(currentIndentLevel - 1, 0)
                    : currentIndentLevel;
                const formattedLine = `${indentUnit.repeat(lineIndentLevel)}${formatLineSyntax(
                    trimmed,
                    language
                )}`;

                const openCount = countChar(braceScanText, "{");
                const closeCount = countChar(braceScanText, "}");
                indentLevel = Math.max(currentIndentLevel + openCount - closeCount + leadingCloseBraces, 0);

                return formattedLine;
            })
            .join("\n")
            .trim();
    }

    function formatSolutionCodeForClipboard(code, language) {
        const normalizedLanguage = normalizeLanguage(language);
        const originalCode = String(code || "");
        const cleanedCode = normalizeCodeWhitespace(originalCode, normalizedLanguage);

        if (!shouldUseBraceFormatter(normalizedLanguage)) {
            return {
                code: cleanedCode,
                changed: cleanedCode !== originalCode,
                formatter: "whitespace",
            };
        }

        const formattedCode = formatBraceBasedCode(cleanedCode, normalizedLanguage);

        return {
            code: formattedCode,
            changed: formattedCode !== originalCode,
            formatter: "simple-brace-indent",
        };
    }

    function copyPayloadToClipboard(payload) {
        const text = JSON.stringify(payload, null, 2);

        if (typeof GM_setClipboard === "function") {
            GM_setClipboard(text, "text");
            return Promise.resolve();
        }

        return navigator.clipboard.writeText(text);
    }

    async function handleCopy() {
        const titleSlug = getTitleSlugFromUrl();

        if (!titleSlug) {
            console.warn("[LeetCode Copy to Obsidian] 没有识别到题目 slug");
            flashButton(false);
            return;
        }

        const solution = getCurrentSolution();
        const rawCode = solution.code || "";
        const language = normalizeLanguage(solution.language || "cpp");

        if (!rawCode.trim()) {
            console.warn("[LeetCode Copy to Obsidian] 没有读取到代码，请确认代码编辑器已加载");
            console.warn("[LeetCode Copy to Obsidian] monaco:", getMonaco());
            flashButton(false);
            return;
        }

        const formatResult = FORMAT_CODE_BEFORE_COPY
            ? formatSolutionCodeForClipboard(rawCode, language)
            : {
                code: rawCode,
                changed: false,
                formatter: "disabled",
            };
        const code = formatResult.code || rawCode;

        const payload = {
            type: "leetcode-cn-obsidian",
            version: 1,
            url: location.href,
            titleSlug,
            language,
            code,
            rawCode,
            format: {
                formatter: formatResult.formatter,
                changed: formatResult.changed,
            },
            copiedAt: new Date().toISOString(),
        };

        try {
            await copyPayloadToClipboard(payload);

            console.log("[LeetCode Copy to Obsidian] copied payload:", {
                titleSlug,
                language,
                codeLength: code.length,
                rawCodeLength: rawCode.length,
                formatter: formatResult.formatter,
                formatted: formatResult.changed,
                codePreview: code.slice(0, 200),
                codeTail: code.slice(-200),
            });

            // 成功时不弹 toast，只让按钮短暂变绿
            flashButton(true);
        } catch (error) {
            console.error("[LeetCode Copy to Obsidian] 复制失败：", error);
            flashButton(false);
        }
    }

    function createObsidianIconSvg() {
        return `
      <svg viewBox="0 0 64 64" width="20" height="20" aria-hidden="true">
        <path
          d="M30 4 12 18 8 42l17 18 25-7 6-26L43 8Z"
          fill="none"
          stroke="currentColor"
          stroke-width="5"
          stroke-linejoin="round"
        />
        <path
          d="M30 4c6 10 6 19 0 28M12 18c10 4 16 9 18 14M25 60c0-11 2-20 5-28M43 8c-2 12-7 20-13 24M50 53c-6-8-13-15-20-21"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.95"
        />
      </svg>
    `;
    }

    function createFloatingButton() {
        const btn = document.createElement("button");

        btn.id = BUTTON_ID;
        btn.type = "button";
        btn.title = "复制题目代码到 Obsidian";
        btn.setAttribute("aria-label", "复制题目代码到 Obsidian");
        btn.innerHTML = createObsidianIconSvg();

        Object.assign(btn.style, {
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 999999,
            width: "36px",
            height: "36px",
            minWidth: "36px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            outline: "none",
            padding: "0",
            margin: "0",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            background: "rgba(30, 30, 30, 0.82)",
            color: "rgb(156, 163, 175)",
            backdropFilter: "blur(10px)",
            transition:
                "background 120ms ease, color 120ms ease, transform 80ms ease, opacity 120ms ease, border-color 120ms ease",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.28)",
            opacity: "0.92",
        });

        btn.addEventListener("mouseenter", () => {
            btn.style.background = "rgba(45, 45, 45, 0.95)";
            btn.style.color = "rgb(229, 231, 235)";
            btn.style.borderColor = "rgba(255, 255, 255, 0.18)";
            btn.style.opacity = "1";
        });

        btn.addEventListener("mouseleave", () => {
            btn.style.background = "rgba(30, 30, 30, 0.82)";
            btn.style.color = "rgb(156, 163, 175)";
            btn.style.borderColor = "rgba(255, 255, 255, 0.10)";
            btn.style.opacity = "0.92";
        });

        btn.addEventListener("mousedown", () => {
            btn.style.transform = "scale(0.94)";
        });

        btn.addEventListener("mouseup", () => {
            btn.style.transform = "scale(1)";
        });

        btn.addEventListener("click", handleCopy);

        return btn;
    }

    function positionFloatingButton() {
        const btn = document.querySelector(`#${BUTTON_ID}`);
        if (!btn) return;

        Object.assign(btn.style, {
            position: "fixed",
            right: "24px",
            bottom: "24px",
            left: "auto",
            top: "auto",
            zIndex: 999999,
        });
    }

    function ensureFloatingButton() {
        let btn = document.querySelector(`#${BUTTON_ID}`);

        if (!btn) {
            btn = createFloatingButton();
            document.body.appendChild(btn);
        }

        positionFloatingButton();
    }

    function flashButton(success) {
        const btn = document.querySelector(`#${BUTTON_ID}`);
        if (!btn) return;

        const oldColor = btn.style.color;
        const oldBackground = btn.style.background;
        const oldBorderColor = btn.style.borderColor;

        btn.style.color = success ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";
        btn.style.background = success
            ? "rgba(34, 197, 94, 0.14)"
            : "rgba(239, 68, 68, 0.14)";
        btn.style.borderColor = success
            ? "rgba(34, 197, 94, 0.30)"
            : "rgba(239, 68, 68, 0.30)";

        setTimeout(() => {
            btn.style.color = oldColor || "rgb(156, 163, 175)";
            btn.style.background = oldBackground || "rgba(30, 30, 30, 0.82)";
            btn.style.borderColor = oldBorderColor || "rgba(255, 255, 255, 0.10)";
        }, 650);
    }

    function exposeDebugHelpers() {
        unsafeWindow.__LC_OBSIDIAN_DEBUG_MODELS__ = function () {
            const monaco = getMonaco();

            if (!monaco || !monaco.editor) {
                console.warn("monaco.editor 不存在");
                return [];
            }

            const models = monaco.editor.getModels?.() || [];

            const result = models.map((model, index) => {
                const value = model.getValue?.() || "";

                return {
                    index,
                    languageId: model.getLanguageId?.() || "",
                    length: value.length,
                    uri: model.uri?.toString?.() || "",
                    preview: value.slice(0, 200),
                    tail: value.slice(-200),
                };
            });

            console.table(result);
            return result;
        };
    }

    function init() {
        ensureFloatingButton();
        exposeDebugHelpers();

        // LeetCode 是 SPA，切换题目或重绘页面时 DOM 会变化，所以定时确保按钮存在
        setInterval(ensureFloatingButton, 1200);
    }

    init();
})();
