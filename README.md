<div align="center">

<sub>🌐 us <b>English</b> | <a href="./README.zh-CN.md">cn 简体中文</a></sub>

# LeetCode to Obsidian

**One-click capture LeetCode CN problems and your solution code into beautifully formatted Obsidian notes.**

[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-userscript-00485B?logo=tampermonkey&logoColor=white)](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js)
[![Obsidian](https://img.shields.io/badge/Obsidian-QuickAdd-7C3AED?logo=obsidian&logoColor=white)](./Scripts/leetcode-quickadd.js)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

</div>

---

## ✨ Features

- 🖱️ **One-click copy** — A floating Obsidian button on every `leetcode.cn/problems/*` page captures your current Monaco-editor code together with the problem URL.
- 🧠 **Smart code detection** — Scores Monaco models by language, content patterns and length so it always picks the real `class Solution` model, never the JSON test-case model.
- 📥 **Clipboard handoff** — Code travels to Obsidian as a typed JSON payload (`type: "leetcode-cn-obsidian"`), with a manual-paste fallback.
- 🌏 **Chinese problem fetch** — Pulls `translatedTitle` / `translatedContent` / `translatedName` directly from `leetcode.cn/graphql/`.
- 🪄 **Native Obsidian rendering** — Examples become `>[!Example]+` callouts, constraints become `>[!warning]+`, hints become `>[!Hint]-`, with proper inline code, lists, images and superscripts.
- 🏷️ **Stable tags** — Uses English topic slugs with a configurable prefix (default `leetcode/`) for reliable Dataview queries.
- 🔁 **Layered fallbacks** — Editors → models → DOM textarea on the browser side; clipboard → manual URL → manual paste on the Obsidian side.

## 🧩 Architecture

```
Browser (LeetCode CN)  ──Tampermonkey──▶  Clipboard (JSON payload)
                                              │
                                              ▼
        Obsidian  ──QuickAdd script──▶  GraphQL fetch  ──▶  Template render  ──▶  Note
```

| Layer | File | Responsibility |
| --- | --- | --- |
| Userscript | [`tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js`](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js) | Inject floating button, extract code from Monaco, write JSON payload to clipboard. |
| QuickAdd script | [`Scripts/leetcode-quickadd.js`](./Scripts/leetcode-quickadd.js) | Read clipboard, call LeetCode CN GraphQL, convert HTML → Obsidian Markdown, expose template variables. |
| Templates | [`Templates/leetcode-problem-template_zh.md`](./Templates/leetcode-problem-template_zh.md) · [`Templates/leetcode-problem-template.md`](./Templates/leetcode-problem-template.md) | Final note layout with frontmatter, callouts and code blocks. |

## 📦 Requirements

- A Chromium / Firefox browser with [Tampermonkey](https://www.tampermonkey.net/)
- [Obsidian](https://obsidian.md/) with the [QuickAdd](https://github.com/chhoumann/quickadd) plugin installed

## 🚀 Installation

### 1. Install the userscript

1. Open Tampermonkey → **Create a new script**.
2. Paste the contents of [`tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js`](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js).
3. Save. Visit any `https://leetcode.cn/problems/...` page — a small Obsidian icon will appear at the bottom-right.

### 2. Add the QuickAdd script

1. Copy [`Scripts/leetcode-quickadd.js`](./Scripts/leetcode-quickadd.js) into your Obsidian vault (e.g. `<vault>/Scripts/`).
2. In Obsidian → **Settings → QuickAdd → Manage Macros**, create a macro and add a **User Script** action pointing to `leetcode-quickadd.js`.
3. (Optional) Set the **LeetCode Tag Prefix** option (default `leetcode/`).

### 3. Add the template

1. Copy [`Templates/leetcode-problem-template_zh.md`](./Templates/leetcode-problem-template_zh.md) into your templates folder.
2. Create a QuickAdd **Template** choice that:
   - Uses the macro above as a script step.
   - Uses `leetcode-problem-template_zh.md` as the template file.
   - Sets the file name to `{{VALUE:fileName}}`.

## 💡 Usage

1. Open a problem page on `leetcode.cn`, write your solution in the editor.
2. Click the floating Obsidian button — it briefly turns green on success.
3. Switch to Obsidian and trigger your QuickAdd choice.
4. A new note is created with the Chinese problem statement, examples, constraints, hints, your code and frontmatter (difficulty, tags, link).

If the clipboard does not contain a valid payload, the script falls back to manual mode and prompts you for the URL/slug and code.

## 🎨 Output preview

The HTML problem statement is parsed into native Obsidian callouts:

```markdown
>[!Example]+ 示例 1
>**输入**：`nums = [2,7,11,15], target = 9`
>**输出**：`[0,1]`
>**解释**：因为 nums[0] + nums[1] == 9，返回 [0, 1]。

>[!warning]+ 约束条件
>2 <= nums.length <= 10^4
>-10^9 <= nums[i] <= 10^9

>[!Hint]- 提示 1
>A really brute force way would be to search for all possible pairs of numbers...
```

## ⚙️ Template variables

The QuickAdd script exposes the following variables for templates:

| Variable | Description |
| --- | --- |
| `{{VALUE:id}}` | Problem frontend id (e.g. `1`) |
| `{{VALUE:title}}` | Translated Chinese title |
| `{{VALUE:link}}` | Canonical `leetcode.cn` URL |
| `{{VALUE:difficulty}}` | `简单` / `中等` / `困难` |
| `{{VALUE:problemStatement}}` | HTML problem statement converted to Obsidian Markdown |
| `{{VALUE:formattedHints}}` | Hints rendered as `>[!Hint]-` callouts |
| `{{VALUE:tags}}` | YAML list of `leetcode/<slug>` tags |
| `{{VALUE:fileName}}` | Sanitized `id. title` filename |
| `{{VALUE:language}}` | Normalized language id (`cpp`, `python`, `go`, ...) |
| `{{VALUE:solutionCode}}` | Your solution code |
| `{{VALUE:sourceUrl}}` | Source URL (from userscript) |
| `{{VALUE:titleSlug}}` | Problem slug |
| `{{VALUE:type}}` | Note type (always `leetcode`, used by Dataview queries) |
| `{{VALUE:status}}` | Completion status (always `done`, used by Dataview queries) |
| `{{VALUE:doneDate}}` | Completion date (`YYYY-MM-DD`, defaults to today) |
| `{{VALUE:createdAt}}` | Note creation timestamp (`YYYY-MM-DD HH:mm:ss`, defaults to now) |
| `{{VALUE:lcId}}` | LeetCode internal problem number (same as `id`, used by DataviewJS sorting) |
| `{{VALUE:difficultyRaw}}` | Raw difficulty identifier (`Easy` / `Medium` / `Hard`, English) |

## 📊 Practice statistics

This repo ships a DataviewJS statistics page [`statistics/leetcode-statistics.md`](./statistics/leetcode-statistics.md) that automatically groups your solved problems by completion date.

To use it:

1. Copy `statistics/leetcode-statistics.md` into your Obsidian vault.
2. Install the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin (JavaScript queries must be enabled).
3. Ensure notes in your `notes/leetcode` folder have `type: leetcode`, `status: done`, and `done_date` fields (the new templates generate these automatically).
4. Open the statistics page to see problems grouped by date, showing problem number, title, difficulty and a link to the note.

> **Tip**: The templates now include `type`, `status`, `done_date`, `lc_id` and other frontmatter fields that power the DataviewJS statistics feature.

## 🛠️ Troubleshooting

- **Button not visible** — LeetCode is a SPA; the script re-injects every 1.2s. Try a hard refresh.
- **Wrong code captured** — Open the browser console and run `__LC_OBSIDIAN_DEBUG_MODELS__()` to inspect Monaco models, then set `MODEL_INDEX_OVERRIDE` in the userscript.
- **Clipboard empty in Obsidian** — Some OSes require focusing Obsidian before clipboard reads succeed; click into the app first, then run QuickAdd.
- **Problem statement is empty** — Confirm you can reach `leetcode.cn/graphql/` from the machine running Obsidian (no VPN issues).

## 📁 Project structure

```
leetcode-to-obsidian/
├── Scripts/
│   └── leetcode-quickadd.js                 # QuickAdd user script for Obsidian
├── Templates/
│   ├── leetcode-problem-template.md         # English template
│   └── leetcode-problem-template_zh.md      # Chinese template (recommended)
├── statistics/
│   └── leetcode-statistics.md               # DataviewJS practice statistics page
└── tampermonkey/Scripts/
    └── leetcode-cn-copy-to-obsidian.js      # Userscript for leetcode.cn
```

## 🤝 Contributing

Issues and pull requests are welcome. Please describe your environment (Obsidian / QuickAdd / Tampermonkey versions) when reporting bugs.

## 📄 License

Released under the [MIT License](#license). The QuickAdd script is adapted from work by Shane Zimmerman ([zimmshane/leetcode-puller-obsidian](https://github.com/zimmshane/leetcode-puller-obsidian)), modified for LeetCode CN with clipboard-based code handoff.
