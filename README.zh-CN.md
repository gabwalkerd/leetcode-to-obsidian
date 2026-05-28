<div align="center">

<sub>🌐 <a href="./README.md">us English</a> | cn <b>简体中文</b></sub>

# LeetCode to Obsidian

**一键把力扣（中国站）题目和你的解题代码搬进 Obsidian，自动生成排版精美的题解笔记。**

[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-userscript-00485B?logo=tampermonkey&logoColor=white)](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js)
[![Obsidian](https://img.shields.io/badge/Obsidian-QuickAdd-7C3AED?logo=obsidian&logoColor=white)](./Scripts/leetcode-quickadd.js)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#开源协议)

</div>

---

## ✨ 特性

- 🖱️ **一键复制** —— 在每个 `leetcode.cn/problems/*` 页面右下角注入 Obsidian 悬浮按钮，自动抓取 Monaco 编辑器中的代码与题目链接。
- 🧠 **智能识别代码** —— 通过语言 / 内容特征 / 长度对 Monaco model 打分，永远挑出真正的 `class Solution`，不会误抓 JSON 测试用例。
- 📥 **剪贴板传递** —— 代码以带类型标识的 JSON（`type: "leetcode-cn-obsidian"`）通过剪贴板送达 Obsidian，并提供手动粘贴兜底。
- 🌏 **拉取中文题面** —— 直接调用 `leetcode.cn/graphql/` 获取 `translatedTitle` / `translatedContent` / `translatedName`。
- 🪄 **原生 Obsidian 渲染** —— 示例转为 `>[!Example]+`、约束条件转为 `>[!warning]+`、提示转为 `>[!Hint]-`，正确处理行内代码、列表、图片、上标。
- 🏷️ **稳定标签** —— 使用英文 topic slug + 可配置前缀（默认 `leetcode/`），便于 Dataview 查询。
- 🔁 **多层兜底** —— 浏览器侧：editors → models → DOM textarea；Obsidian 侧：剪贴板 → 手动 URL → 手动粘贴。

## 🧩 架构

```
浏览器（力扣中国站）  ──Tampermonkey──▶  剪贴板（JSON payload）
                                            │
                                            ▼
       Obsidian  ──QuickAdd 脚本──▶  GraphQL 拉题面  ──▶  套模板  ──▶  生成笔记
```

| 模块 | 文件 | 职责 |
| --- | --- | --- |
| 油猴脚本 | [`tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js`](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js) | 注入悬浮按钮，从 Monaco 中提取代码，把 JSON payload 写入剪贴板。 |
| QuickAdd 脚本 | [`Scripts/leetcode-quickadd.js`](./Scripts/leetcode-quickadd.js) | 读取剪贴板，调用力扣 GraphQL，把 HTML 题面转换成 Obsidian Markdown，输出模板变量。 |
| 模板 | [`Templates/leetcode-problem-template_zh.md`](./Templates/leetcode-problem-template_zh.md) · [`Templates/leetcode-problem-template.md`](./Templates/leetcode-problem-template.md) | 最终笔记的 frontmatter、callout 和代码块布局。 |

## 📦 环境要求

- 装有 [Tampermonkey](https://www.tampermonkey.net/) 的 Chromium / Firefox 浏览器
- 装有 [QuickAdd](https://github.com/chhoumann/quickadd) 插件的 [Obsidian](https://obsidian.md/)

## 🚀 安装

### 1. 安装油猴脚本

1. 打开 Tampermonkey → **添加新脚本**。
2. 把 [`tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js`](./tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js) 内容粘贴进去。
3. 保存。打开任意 `https://leetcode.cn/problems/...` 页面，右下角会出现一个 Obsidian 小图标。

### 2. 添加 QuickAdd 脚本

1. 把 [`Scripts/leetcode-quickadd.js`](./Scripts/leetcode-quickadd.js) 复制到你的 Obsidian Vault（例如 `<vault>/Scripts/`）。
2. 在 Obsidian → **设置 → QuickAdd → Manage Macros** 中新建一个 Macro，并添加一个 **User Script** 步骤，指向 `leetcode-quickadd.js`。
3.（可选）配置 **LeetCode Tag Prefix**（默认为 `leetcode/`）。

### 3. 添加模板

1. 把 [`Templates/leetcode-problem-template_zh.md`](./Templates/leetcode-problem-template_zh.md) 复制到你的模板文件夹。
2. 在 QuickAdd 中新建一个 **Template** 类型的 Choice：
   - 在脚本步骤中调用上面创建的 Macro。
   - 模板文件选择 `leetcode-problem-template_zh.md`。
   - 文件名设置为 `{{VALUE:fileName}}`。

## 💡 使用方式

1. 在 `leetcode.cn` 打开一道题，编辑器里写好你的解。
2. 点击右下角的 Obsidian 悬浮按钮 —— 成功时按钮会短暂变绿。
3. 切换到 Obsidian，触发对应的 QuickAdd Choice。
4. 自动生成一篇新笔记：包含中文题面、示例、约束条件、提示、你的代码，以及 frontmatter（难度、标签、链接等）。

如果剪贴板里没有有效 payload，脚本会自动进入手动模式，提示你输入 URL/slug 和代码。

## 🎨 输出效果

题面 HTML 会被转换成 Obsidian 原生 callout：

```markdown
>[!Example]+ 示例 1
>**输入**：`nums = [2,7,11,15], target = 9`
>**输出**：`[0,1]`
>**解释**：因为 nums[0] + nums[1] == 9，返回 [0, 1]。

>[!warning]+ 约束条件
>2 <= nums.length <= 10^4
>-10^9 <= nums[i] <= 10^9

>[!Hint]- 提示 1
>暴力解法是枚举所有数对……
```

## ⚙️ 模板变量

QuickAdd 脚本会向模板暴露以下变量：

| 变量 | 含义 |
| --- | --- |
| `{{VALUE:id}}` | 题目前端编号（例如 `1`） |
| `{{VALUE:title}}` | 中文标题 |
| `{{VALUE:link}}` | 力扣中国站规范 URL |
| `{{VALUE:difficulty}}` | `简单` / `中等` / `困难` |
| `{{VALUE:problemStatement}}` | 转换后的 Markdown 题面 |
| `{{VALUE:formattedHints}}` | 渲染为 `>[!Hint]-` callout 的提示 |
| `{{VALUE:tags}}` | YAML 形式的 `leetcode/<slug>` 标签列表 |
| `{{VALUE:fileName}}` | 清理过非法字符的 `编号. 标题` 文件名 |
| `{{VALUE:language}}` | 规范化的语言标识（`cpp`、`python`、`go` 等） |
| `{{VALUE:solutionCode}}` | 你的解题代码 |
| `{{VALUE:sourceUrl}}` | 源 URL（来自油猴脚本） |
| `{{VALUE:titleSlug}}` | 题目 slug |
| `{{VALUE:type}}` | 笔记类型（固定 `leetcode`，供 Dataview 查询） |
| `{{VALUE:status}}` | 完成状态（固定 `done`，供 Dataview 查询） |
| `{{VALUE:doneDate}}` | 刷题完成日期（`YYYY-MM-DD`，默认当天） |
| `{{VALUE:createdAt}}` | 笔记创建时间（`YYYY-MM-DD HH:mm:ss`，默认当前时刻） |
| `{{VALUE:lcId}}` | 力扣内部题号（与 `id` 相同，供 DataviewJS 排序使用） |
| `{{VALUE:difficultyRaw}}` | 原始难度标识（`Easy` / `Medium` / `Hard`，英文） |

## 📊 刷题统计

仓库内置了一份 DataviewJS 统计页面 [`statistics/leetcode-statistics.md`](./statistics/leetcode-statistics.md)，按完成日期自动分组展示你已刷完的题目，并可以读取题单配置显示当前题单进度。统计页的“未做题目”入口会打开 [`statistics/leetcode-study-plan-unsolved.md`](./statistics/leetcode-study-plan-unsolved.md)，按题单官方分类列出还没完成的题目。

使用方法：

1. 把 `statistics/leetcode-statistics.md`、`statistics/leetcode-study-plan-unsolved.md`、`statistics/leetcode-study-plan-current.md` 和题单配置文件复制到你的 Obsidian Vault 同一个文件夹；题单配置也可以放在统计页同目录的子文件夹中。
2. 安装 [Dataview](https://github.com/blacksmithgu/obsidian-dataview) 插件（需要开启 JavaScript 查询）。
3. 确保笔记的 `notes/leetcode` 文件夹下有 `type: leetcode`、`status: done`、`done_date` 字段（新模板已自动生成这些字段）。
4. 打开统计页面即可查看当前题单进度、截止日期、建议节奏，以及按日期分组的刷题记录；点击“未做题目”可以查看当前题单剩余题目。

`leetcode-study-plan-current.md` 默认选择 `active_plan_id: hot100`。首次使用前，需要生成一个同名题单配置，或把 `active_plan_id` 改成你已有的题单 ID。

也可以用 Node.js 18+ 生成多个本地题单配置：

```bash
node tools/create-study-plan-config.js https://leetcode.cn/studyplan/top-100-liked/ --target-date 2026-12-31 --plan-id hot100 --output-dir statistics/study-plans
```

切换当前题单：

```bash
node tools/switch-study-plan.js hot100 --stats-dir statistics
```

查看本地已有题单：

```bash
node tools/switch-study-plan.js --list --stats-dir statistics
```

生成脚本只在生成配置时请求一次力扣 GraphQL；Obsidian 统计页仍然只读取本地题单配置和 `leetcode-study-plan-current.md`。

> 如果旧题单配置没有 `difficulty` 字段，未做题目页会显示“未知”。重新运行生成命令即可补全难度。

> **提示**：模板新增了 `type`、`status`、`done_date`、`lc_id` 等 frontmatter 字段，这些字段是 DataviewJS 统计功能的基础。

## 🛠️ 常见问题

- **按钮不显示** —— 力扣是 SPA，脚本会每 1.2 秒重新注入；可以强制刷新一次。
- **抓到的代码不对** —— 在浏览器控制台运行 `__LC_OBSIDIAN_DEBUG_MODELS__()` 查看所有 model，必要时在油猴脚本里设置 `MODEL_INDEX_OVERRIDE` 强制指定 index。
- **Obsidian 里读不到剪贴板** —— 部分系统要求 Obsidian 处于焦点才能访问剪贴板，先点一下 Obsidian 再触发 QuickAdd。
- **题面为空** —— 确认运行 Obsidian 的机器可以访问 `leetcode.cn/graphql/`（注意 VPN / 网络代理）。

## 📁 项目结构

```
leetcode-to-obsidian/
├── Scripts/
│   └── leetcode-quickadd.js                 # Obsidian 端的 QuickAdd 脚本
├── Templates/
│   ├── leetcode-problem-template.md         # 英文模板
│   └── leetcode-problem-template_zh.md      # 中文模板（推荐）
├── statistics/
│   ├── leetcode-statistics.md               # DataviewJS 刷题统计页面
│   ├── leetcode-study-plan-unsolved.md      # 当前题单未做题目页面
│   └── leetcode-study-plan-current.md       # 当前题单选择器
├── tools/
│   ├── create-study-plan-config.js          # 从力扣题单 URL 生成本地配置
│   └── switch-study-plan.js                 # 切换当前本地题单
└── tampermonkey/Scripts/
    └── leetcode-cn-copy-to-obsidian.js      # 力扣中国站的油猴脚本
```

## 🤝 参与贡献

欢迎提交 Issue 与 PR。提交 Bug 时请附上你的环境信息（Obsidian / QuickAdd / Tampermonkey 版本）。

## 📄 开源协议

基于 [MIT License](#开源协议) 发布。QuickAdd 脚本部分基于 Shane Zimmerman 的工作（[zimmshane/leetcode-puller-obsidian](https://github.com/zimmshane/leetcode-puller-obsidian)）改造而来，针对力扣中国站新增了剪贴板代码传递能力。
