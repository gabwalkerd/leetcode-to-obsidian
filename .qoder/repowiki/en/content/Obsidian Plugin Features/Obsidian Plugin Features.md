# Obsidian Plugin Features

<cite>
**Referenced Files in This Document**
- [Scripts/leetcode-quickadd.js](file://Scripts/leetcode-quickadd.js)
- [Templates/leetcode-problem-template.md](file://Templates/leetcode-problem-template.md)
- [Templates/leetcode-problem-template_zh.md](file://Templates/leetcode-problem-template_zh.md)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendix](#appendix)

## Introduction
This project provides an automated workflow paired with the Obsidian plugin, with the goal of quickly importing problem information and code from LeetCode CN into Obsidian notes. Its core capabilities include:
- Reading the problem payload copied by the Tampermonkey script via the clipboard, and automatically extracting problem slug, language, code, and source URL
- Falling back to manual URL/slug input and code paste when the clipboard is unavailable or contains no valid payload
- Fetching CN problem content, difficulty, tags, and hints via GraphQL queries
- Converting HTML problem content into Obsidian-friendly Markdown
- Setting QuickAdd template variables for template rendering
- Supporting tag prefix settings and bilingual (Chinese/English) templates

This document is intended for users with different technical backgrounds, providing both high-level architectural explanations and code-level details with visual diagrams to help readers understand implementation principles and usage methods.

## Project Structure
- Scripts/leetcode-quickadd.js: The Obsidian QuickAdd module entry point, responsible for input collection, GraphQL queries, HTML→Markdown conversion, variable setting, and notifications
- tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js: The Tampermonkey script, responsible for automatically extracting code and language on LeetCode pages and writing the standardized payload to the clipboard
- Templates/leetcode-problem-template.md: English template
- Templates/leetcode-problem-template_zh.md: Chinese template

```mermaid
graph TB
subgraph "Obsidian"
QA["QuickAdd Module<br/>Scripts/leetcode-quickadd.js"]
T_EN["Template: English<br/>Templates/leetcode-problem-template.md"]
T_ZH["Template: Chinese<br/>Templates/leetcode-problem-template_zh.md"]
end
subgraph "Browser"
TM["Tampermonkey Script<br/>tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js"]
LC["LeetCode CN"]
end
TM --> |"Copy standardized payload to clipboard"| QA
QA --> |"GraphQL query"| LC
QA --> |"Render template"| T_EN
QA --> |"Render template"| T_ZH
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:1-104](file://Scripts/leetcode-quickadd.js#L1-L104)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:305-363](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L305-L363)
- [Templates/leetcode-problem-template.md:1-35](file://Templates/leetcode-problem-template.md#L1-L35)
- [Templates/leetcode-problem-template_zh.md:1-41](file://Templates/leetcode-problem-template_zh.md#L1-L41)

Section Sources
- [Scripts/leetcode-quickadd.js:1-104](file://Scripts/leetcode-quickadd.js#L1-L104)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:12-536](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L12-L536)
- [Templates/leetcode-problem-template.md:1-35](file://Templates/leetcode-problem-template.md#L1-L35)
- [Templates/leetcode-problem-template_zh.md:1-41](file://Templates/leetcode-problem-template_zh.md#L1-L41)

## Core Components
- QuickAdd Module Entry and Configuration
  - Module export entry, name, author, and settings (tag prefix)
  - Main flow: Get context → Fetch problem → Set variables → Notify
- Input and Clipboard Handling
  - Read standardized payload from clipboard preferentially; otherwise enter manual mode (URL/slug + code)
  - Support wide input box and fallback input box, automatically parsing the code field from the JSON payload
- GraphQL Query and Data Processing
  - Build query body, send POST request, parse response data, and map to internal structure
- HTML→Markdown Conversion Engine
  - Parse HTML structure, recognize examples, constraints, lists, images, links, etc., and convert by rules to Obsidian blocks/lists/quote blocks
- Template Variables and Rendering
  - Set variables such as filename, difficulty link, tags, formatted hints, language, code, source URL, slug, etc.
  - Chinese and English templates render separately; the Chinese template includes a code block language placeholder

Section Sources
- [Scripts/leetcode-quickadd.js:56-104](file://Scripts/leetcode-quickadd.js#L56-L104)
- [Scripts/leetcode-quickadd.js:114-166](file://Scripts/leetcode-quickadd.js#L114-L166)
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)
- [Scripts/leetcode-quickadd.js:436-546](file://Scripts/leetcode-quickadd.js#L436-L546)
- [Scripts/leetcode-quickadd.js:410-430](file://Scripts/leetcode-quickadd.js#L410-L430)
- [Templates/leetcode-problem-template.md:1-35](file://Templates/leetcode-problem-template.md#L1-L35)
- [Templates/leetcode-problem-template_zh.md:1-41](file://Templates/leetcode-problem-template_zh.md#L1-L41)

## Architecture Overview
The overall workflow is divided into two parts: "browser-side payload collection" and "Obsidian-side processing and rendering":
- Browser side: The Tampermonkey script automatically extracts code and language on the LeetCode page, builds a standardized payload, and writes it to the clipboard
- Obsidian side: QuickAdd reads the clipboard preferentially, otherwise prompts manual input; then fetches problem details via GraphQL; converts HTML content to Markdown; sets template variables and triggers template rendering

```mermaid
sequenceDiagram
participant User as "User"
participant TM as "Tampermonkey Script"
participant QA as "QuickAdd Module"
participant LC as "LeetCode GraphQL"
User->>TM : Click copy button on LeetCode page
TM->>TM : Extract code and language
TM->>QA : Write standardized payload to clipboard
User->>QA : Trigger QuickAdd module
QA->>QA : Read clipboard payload
alt Clipboard valid
QA->>QA : Parse payload and set context
else Clipboard invalid
QA->>User : Prompt for URL/slug
User-->>QA : Input
QA->>User : Prompt to paste code
User-->>QA : Paste
QA->>QA : Parse payload or use input directly
end
QA->>LC : Send GraphQL query
LC-->>QA : Return problem data
QA->>QA : HTML→Markdown conversion
QA->>QA : Set template variables
QA-->>User : Notify and wait for template rendering
```

Diagram Sources
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:316-363](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L316-L363)
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)

## Detailed Component Analysis

### QuickAdd Module and Main Workflow
- Module exports: entry, settings (including tag prefix setting)
- Main flow: Get context → Fetch problem → Set variables → Notify
- Error handling: Prompt and short-circuit return on empty slug, request failure, or parse failure

```mermaid
flowchart TD
Start(["Start"]) --> GetCtx["Get problem context"]
GetCtx --> HasCtx{"Context valid?"}
HasCtx --> |No| NotifyFail["Notify failure and exit"]
HasCtx --> |Yes| FetchQ["Fetch problem via GraphQL"]
FetchQ --> QOK{"Fetch succeeded?"}
QOK --> |No| NotifyFail
QOK --> |Yes| SetVars["Set template variables"]
SetVars --> Done(["End"])
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [Scripts/leetcode-quickadd.js:94-99](file://Scripts/leetcode-quickadd.js#L94-L99)

Section Sources
- [Scripts/leetcode-quickadd.js:56-104](file://Scripts/leetcode-quickadd.js#L56-L104)

### Input and Clipboard Handling
- Read standardized payload (type: leetcode-cn-obsidian) from the clipboard preferentially, automatically extracting titleSlug, language, code, url
- If clipboard is invalid or non-standard payload, enter manual mode: input URL/slug, then paste code via prompt
- Automatically detect whether the pasted content is a JSON payload; if so, extract the code field; otherwise treat as plain code
- URL/slug extraction supports multiple path forms, compatible with relative paths and full URLs

```mermaid
flowchart TD
A["Read clipboard"] --> B{"JSON with type=leetcode-cn-obsidian?"}
B --> |Yes| C["Extract titleSlug/language/code/url"]
B --> |No| D["Prompt for URL/slug"]
D --> E{"Input is URL?"}
E --> |Yes| F["Use input as url"]
E --> |No| G["Extract slug"]
F --> H["Prompt to paste code"]
G --> H
H --> I{"Pasted content is JSON?"}
I --> |Yes| J["Extract code and normalize"]
I --> |No| K["Normalize code directly"]
C --> L["Return context"]
J --> L
K --> L
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)
- [Scripts/leetcode-quickadd.js:172-214](file://Scripts/leetcode-quickadd.js#L172-L214)
- [Scripts/leetcode-quickadd.js:216-232](file://Scripts/leetcode-quickadd.js#L216-L232)
- [Scripts/leetcode-quickadd.js:277-293](file://Scripts/leetcode-quickadd.js#L277-L293)

Section Sources
- [Scripts/leetcode-quickadd.js:114-166](file://Scripts/leetcode-quickadd.js#L114-L166)
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)
- [Scripts/leetcode-quickadd.js:277-293](file://Scripts/leetcode-quickadd.js#L277-L293)

### GraphQL Query and Data Retrieval
- Query name and variables: questionData(titleSlug)
- Query fields: Problem ID, frontend ID, title, slug, translated title, content, difficulty, hints, tags
- Request headers: Content-Type, Referer, Origin
- Data mapping: id, title, titleSlug, difficulty, link, topicTags, problemStatement, hints

```mermaid
sequenceDiagram
participant QA as "QuickAdd Module"
participant API as "LeetCode GraphQL"
QA->>API : POST /graphql/ {operationName, variables, query}
API-->>QA : {data.question}
QA->>QA : Map to internal structure and validate
QA-->>QA : Return problem data
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)

Section Sources
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)

### HTML→Markdown Conversion Engine
- Core Strategy
  - Iterate child nodes, filter whitespace text and meaningless nodes
  - Recognize Example titles (containing "Example") → Try to match the immediately following code block; if matched, format as Obsidian example block; otherwise generate hint-style example block
  - Recognize Constraints titles (containing "Constraints") → If followed by ordered/unordered list, render as quoted constraint block; otherwise generate hint-style constraint block
  - Recognize "Follow-up" titles → Render as Todo block
  - Standalone pre nodes: If contains "Input/Output/Explanation" labels, format as example; otherwise output as text code block
  - Lists: Recursively render nested lists, supporting ordered/unordered
  - Paragraphs: Convert inline elements to Markdown, with paragraph merging and deduplication
  - Images and links: Inline rendering
- Text Normalization
  - Remove invisible characters, excessive whitespace, unify line breaks
  - Indent line-start quote blocks and compress empty lines
- Tags and Hints
  - Tags: Concatenate slugs with the prefix from settings
  - Hints: Strip HTML tags, render each as a quote block

```mermaid
flowchart TD
S["Start"] --> Parse["Parse HTML root node"]
Parse --> Children["Get significant child nodes"]
Children --> Loop{"Iterate nodes"}
Loop --> |Text| Text["Clean text and append"]
Loop --> |p tag| PType{"Match title type?"}
PType --> |Example| TryPre{"Following pre?"}
TryPre --> |Yes| ExFmt["Format as example block"]
TryPre --> |No| ExHint["Generate example hint block"]
PType --> |Constraints| TryList{"Following ul/ol?"}
TryList --> |Yes| ConList["Render constraint list"]
TryList --> |No| ConHint["Generate constraint hint block"]
PType --> |Follow-up| Adv["Render Follow-up Todo block"]
Loop --> |pre tag| PreType{"Contains Input/Output/Explanation?"}
PreType --> |Yes| PreEx["Format as example"]
PreType --> |No| PreTxt["Render as text code block"]
Loop --> |ul/ol| List["Render list"]
Loop --> |p tag| Para["Inline render and append"]
Loop --> |Other| Inline["Inline render and append"]
Text --> Next["Next node"]
ExFmt --> Next
ExHint --> Next
ConList --> Next
ConHint --> Next
Adv --> Next
PreEx --> Next
PreTxt --> Next
List --> Next
Para --> Next
Inline --> Next
Next --> Loop
Loop --> |End| Join["Merge and clean empty lines"]
Join --> E["End"]
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:436-546](file://Scripts/leetcode-quickadd.js#L436-L546)
- [Scripts/leetcode-quickadd.js:669-699](file://Scripts/leetcode-quickadd.js#L669-L699)
- [Scripts/leetcode-quickadd.js:725-738](file://Scripts/leetcode-quickadd.js#L725-L738)
- [Scripts/leetcode-quickadd.js:740-783](file://Scripts/leetcode-quickadd.js#L740-L783)

Section Sources
- [Scripts/leetcode-quickadd.js:436-546](file://Scripts/leetcode-quickadd.js#L436-L546)
- [Scripts/leetcode-quickadd.js:789-800](file://Scripts/leetcode-quickadd.js#L789-L800)
- [Scripts/leetcode-quickadd.js:801-812](file://Scripts/leetcode-quickadd.js#L801-L812)

### Template Variable Setting and Rendering Mechanism
- Variable List
  - id, title, link, difficulty, problemStatement, hints, topicTags, titleSlug
  - fileName: Composed of id and cleaned title
  - difficultyLink: Difficulty value wrapped in link style
  - tags: Slug list concatenated with the prefix from settings
  - formattedHints: Hints list rendered as quote blocks
  - language: Language from context
  - solutionCode: Normalized code
  - sourceUrl: Source URL
- Rendering Logic
  - Chinese template: Contains code block language placeholder for subsequent replacement
  - English template: Basic fields and structure

```mermaid
classDiagram
class ProblemData {
+string id
+string title
+string titleSlug
+string link
+string difficulty
+string problemStatement
+string[] hints
+Tag[] topicTags
}
class Context {
+string titleSlug
+string sourceUrl
+string language
+string solutionCode
+boolean fromClipboard
}
class Variables {
+string fileName
+string difficultyLink
+string tags
+string formattedHints
+string language
+string solutionCode
+string sourceUrl
+string titleSlug
}
ProblemData --> Variables : "Maps"
Context --> Variables : "Supplements"
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:409-430](file://Scripts/leetcode-quickadd.js#L409-L430)
- [Scripts/leetcode-quickadd.js:832-834](file://Scripts/leetcode-quickadd.js#L832-L834)
- [Templates/leetcode-problem-template_zh.md:30-32](file://Templates/leetcode-problem-template_zh.md#L30-L32)

Section Sources
- [Scripts/leetcode-quickadd.js:410-430](file://Scripts/leetcode-quickadd.js#L410-L430)
- [Templates/leetcode-problem-template.md:1-35](file://Templates/leetcode-problem-template.md#L1-L35)
- [Templates/leetcode-problem-template_zh.md:1-41](file://Templates/leetcode-problem-template_zh.md#L1-L41)

### Configuration Options and Internationalization Support
- Tag Prefix Setting
  - Name: LeetCode Tag Prefix
  - Type: Text
  - Default: leetcode/
  - Effect: Adds a unified prefix to each tag for categorization and search
- Internationalization Support
  - Provides bilingual (Chinese/English) templates; the Chinese template uses Chinese titles and a code language placeholder
  - Difficulty value localization mapping (e.g., Easy→简单)

Section Sources
- [Scripts/leetcode-quickadd.js:58-70](file://Scripts/leetcode-quickadd.js#L58-L70)
- [Scripts/leetcode-quickadd.js:325-333](file://Scripts/leetcode-quickadd.js#L325-L333)
- [Templates/leetcode-problem-template_zh.md:14-41](file://Templates/leetcode-problem-template_zh.md#L14-L41)

### API Interface and Parameters
- GraphQL Query
  - Endpoint: https://leetcode.cn/graphql/
  - Method: POST
  - Request headers: Content-Type, Referer, Origin
  - Query body:
    - operationName: questionData
    - variables: titleSlug
    - query: Query containing problem fields
  - Returns: data.question object containing problem metadata and content
- Clipboard Payload
  - type: leetcode-cn-obsidian
  - url: Problem link
  - titleSlug: Problem slug
  - language: Programming language
  - code: Code content
  - copiedAt: Copy timestamp (optional)

Section Sources
- [Scripts/leetcode-quickadd.js:49-50](file://Scripts/leetcode-quickadd.js#L49-L50)
- [Scripts/leetcode-quickadd.js:341-378](file://Scripts/leetcode-quickadd.js#L341-L378)
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)
- [Scripts/leetcode-quickadd.js:336-344](file://Scripts/leetcode-quickadd.js#L336-L344)

## Dependency Analysis
- QuickAdd Module Dependencies
  - QuickAdd API: Input prompt, wide input prompt, variable setting
  - Browser clipboard: Read JSON payload
  - GraphQL API: Fetch problem data
  - DOM parsing: HTML→Markdown conversion
- External Dependencies
  - Tampermonkey script: Provides standardized payload
  - Obsidian template system: Renders variables

```mermaid
graph LR
QA["QuickAdd Module"] --> API["LeetCode GraphQL"]
QA --> CB["Browser Clipboard"]
QA --> DOM["DOM Parsing"]
QA --> TPL["Template System"]
TM["Tampermonkey Script"] --> CB
QA --> TM
```

Diagram Sources
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:316-363](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L316-L363)

Section Sources
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:12-536](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L12-L536)

## Performance Considerations
- Clipboard reading: Read only once at module startup, avoiding repeated I/O
- GraphQL request: Single query with concise fields, reducing network and parsing overhead
- HTML→Markdown: Linear DOM child node traversal, O(N) complexity, avoiding deep recursion
- Text normalization: Regex replacement and string concatenation; pay attention to memory usage with large text
- Template rendering: Handled by the Obsidian engine; this module only sets variables

## Troubleshooting Guide
- Clipboard unavailable
  - Symptom: Cannot read standardized payload, automatically falls back to manual mode
  - Resolution: Confirm browser allows clipboard access; check whether Tampermonkey script is running normally
- Problem slug not recognized
  - Symptom: Failure prompt persists after entering URL/slug
  - Resolution: Confirm URL is correct and contains slug; or directly enter slug
- GraphQL request failure
  - Symptom: Cannot fetch problem information
  - Resolution: Check network connectivity; confirm endpoint is reachable; check console for errors
- HTML→Markdown conversion anomalies
  - Symptom: Problem content not rendered as expected
  - Resolution: Check HTML structure; confirm Example/Constraints title text; adjust template
- Tag prefix not effective
  - Symptom: Tags lack prefix
  - Resolution: Check whether the setting is saved correctly; confirm {{VALUE:tags}} exists in the template
- Code not rendered correctly
  - Symptom: Code block is empty or has format anomalies
  - Resolution: Confirm the code field in clipboard payload; check normalization logic; the Chinese template's language placeholder needs subsequent replacement

Section Sources
- [Scripts/leetcode-quickadd.js:89-92](file://Scripts/leetcode-quickadd.js#L89-L92)
- [Scripts/leetcode-quickadd.js:96-99](file://Scripts/leetcode-quickadd.js#L96-L99)
- [Scripts/leetcode-quickadd.js:382-385](file://Scripts/leetcode-quickadd.js#L382-L385)
- [Scripts/leetcode-quickadd.js:792-793](file://Scripts/leetcode-quickadd.js#L792-L793)

## Conclusion
This project achieves efficient knowledge migration from LeetCode CN to Obsidian through the collaboration of browser scripts and the Obsidian plugin. Key design points include:
- A standardized payload at the core to simplify cross-end data transfer
- Template variables at the center to decouple data from display
- HTML→Markdown conversion as a bridge to ensure content quality
- Settings and multiple templates as extension points to meet different user needs

In actual use, we recommend:
- Use the Tampermonkey script for automatic copying preferentially to reduce manual input
- Regularly check GraphQL endpoint and template variables to ensure stability
- Adjust conversion rules or templates appropriately for special HTML structures

## Appendix
- Quick Reference
  - Module entry: entry function
  - Settings: LeetCode Tag Prefix (default: leetcode/)
  - Template variables: id, title, link, difficulty, problemStatement, hints, topicTags, fileName, difficultyLink, tags, formattedHints, language, solutionCode, sourceUrl, titleSlug
  - GraphQL endpoint: https://leetcode.cn/graphql/
