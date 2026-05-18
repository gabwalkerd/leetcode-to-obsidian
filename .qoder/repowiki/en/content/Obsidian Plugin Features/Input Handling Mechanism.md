# Input Handling Mechanism

<cite>
**Referenced Files in This Document**
- [Scripts/leetcode-quickadd.js](file://Scripts/leetcode-quickadd.js)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js)
- [Templates/leetcode-problem-template.md](file://Templates/leetcode-problem-template.md)
- [Templates/leetcode-problem-template_zh.md](file://Templates/leetcode-problem-template_zh.md)
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

## Introduction

This document provides a detailed explanation of the input handling mechanism for LeetCode-to-Obsidian, focusing on the implementation principles of three input methods: clipboard payload reading, manual URL/slug input, and manual code paste. The system uses the Tampermonkey script to automatically capture LeetCode problem information and code, which is then processed and rendered by the Obsidian QuickAdd plugin.

The core advantage of this system lies in its seamless multi-step input workflow, from automatic clipboard reading to a complete fallback mechanism for manual input, ensuring users can efficiently create LeetCode problem notes in various scenarios.

## Project Structure

The project adopts a modular design with the following components:

```mermaid
graph TB
subgraph "Main Application Module"
QA[QuickAdd Main Module<br/>leetcode-quickadd.js]
end
subgraph "User Script Module"
TM[Tampermonkey Script<br/>leetcode-cn-copy-to-obsidian.js]
end
subgraph "Template Module"
TPL1[Problem Template<br/>leetcode-problem-template.md]
TPL2[Chinese Template<br/>leetcode-problem-template_zh.md]
end
subgraph "External Services"
LC[LeetCode CN GraphQL API]
end
QA --> TM
QA --> LC
QA --> TPL1
QA --> TPL2
TM --> QA
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:1-868](file://Scripts/leetcode-quickadd.js#L1-L868)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:1-536](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L1-L536)

**Section Sources**
- [Scripts/leetcode-quickadd.js:1-868](file://Scripts/leetcode-quickadd.js#L1-L868)
- [tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js:1-536](file://tampermonkey/Scripts/leetcode-cn-copy-to-obsidian.js#L1-L536)

## Core Components

### Main Input Handling Workflow

The system implements a three-layer input handling mechanism, executed in priority order:

1. **Clipboard Priority Reading**: Automatically detects and parses the payload copied by Tampermonkey
2. **Manual URL Input**: User directly enters the LeetCode problem URL or slug
3. **Manual Code Paste**: User pastes code or a JSON-format payload

### Key Data Structures

```mermaid
classDiagram
class ProblemContext {
+string titleSlug
+string sourceUrl
+string language
+string solutionCode
+boolean fromClipboard
}
class LeetCodePayload {
+string type
+string url
+string titleSlug
+string language
+string code
+string version
+string copiedAt
}
class ProblemData {
+string id
+string title
+string titleSlug
+string difficulty
+string link
+array topicTags
+string problemStatement
+array hints
}
ProblemContext --> LeetCodePayload : "Contains"
ProblemData --> ProblemContext : "Generates"
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:114-166](file://Scripts/leetcode-quickadd.js#L114-L166)
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)

**Section Sources**
- [Scripts/leetcode-quickadd.js:114-166](file://Scripts/leetcode-quickadd.js#L114-L166)
- [Scripts/leetcode-quickadd.js:339-404](file://Scripts/leetcode-quickadd.js#L339-L404)

## Architecture Overview

The system uses a layered architecture design, with each layer having clear responsibility assignments:

```mermaid
sequenceDiagram
participant User as User
participant QA as QuickAdd Module
participant CB as Clipboard
participant TM as Tampermonkey Script
participant API as LeetCode API
User->>QA : Trigger QuickAdd
QA->>CB : Read clipboard content
CB-->>QA : Return payload or empty
alt Clipboard has valid payload
QA->>QA : Parse and validate payload
QA->>API : Fetch problem details
API-->>QA : Return problem data
else Clipboard has no valid payload
QA->>User : Show input dialog
User->>QA : Enter URL or slug
QA->>QA : Parse input content
QA->>User : Show code input box
User->>QA : Paste code
QA->>API : Fetch problem details
API-->>QA : Return problem data
end
QA->>QA : Set template variables
QA-->>User : Generate note
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [Scripts/leetcode-quickadd.js:114-166](file://Scripts/leetcode-quickadd.js#L114-L166)

## Detailed Component Analysis

### Clipboard Payload Reading Mechanism

#### readLeetCodePayloadFromClipboard Function Workflow

This function implements the complete clipboard reading and validation workflow:

```mermaid
flowchart TD
Start([Start reading clipboard]) --> CheckAPI["Check navigator.clipboard API availability"]
CheckAPI --> APIAvailable{"API available?"}
APIAvailable --> |No| ReturnNull1["Return null"]
APIAvailable --> |Yes| ReadText["Read clipboard text"]
ReadText --> HasText{"Has text content?"}
HasText --> |No| ReturnNull2["Return null"]
HasText --> |Yes| ParseJSON["Parse JSON"]
ParseJSON --> ParseSuccess{"JSON parse successful?"}
ParseSuccess --> |No| ReturnNull3["Return null"]
ParseSuccess --> |Yes| ValidateType["Validate payload.type"]
ValidateType --> TypeValid{"type is leetcode-cn-obsidian?"}
TypeValid --> |No| ReturnNull4["Return null"]
TypeValid --> |Yes| ValidateFields["Validate titleSlug or url field"]
ValidateFields --> FieldsValid{"Has titleSlug or url?"}
FieldsValid --> |No| ReturnNull5["Return null"]
FieldsValid --> |Yes| ReturnPayload["Return valid payload"]
ReturnNull1 --> End([End])
ReturnNull2 --> End
ReturnNull3 --> End
ReturnNull4 --> End
ReturnNull5 --> End
ReturnPayload --> End
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)

**Section Sources**
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)

#### navigator.clipboard API Usage Strategy

The system adopts a progressively enhanced API usage strategy:

1. **API Availability Detection**: First check whether the `navigator.clipboard` object and `readText` method exist
2. **Graceful Degradation**: When the API is unavailable, log a warning and degrade gracefully
3. **Error Handling**: Wrap asynchronous operations with try-catch to ensure exceptions don't interrupt the entire workflow

### Manual Input Handling Mechanism

#### promptForInput Function User Interaction Logic

This function handles URL or slug input from the user:

```mermaid
sequenceDiagram
participant QA as QuickAdd Module
participant User as User
participant API as QuickAdd API
QA->>API : Call inputPrompt
API->>User : Show input dialog
User->>API : Enter URL or slug
API->>QA : Return input content
alt Input is empty
QA->>QA : Log notification and return null
else Input is valid
QA->>QA : Clean and validate input
QA->>QA : Return cleaned input
end
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:172-184](file://Scripts/leetcode-quickadd.js#L172-L184)

**Section Sources**
- [Scripts/leetcode-quickadd.js:172-184](file://Scripts/leetcode-quickadd.js#L172-L184)

#### promptForSolutionCode Function Code Input Logic

This function implements intelligent code input handling:

```mermaid
flowchart TD
Start([Start code input]) --> CheckWideAPI["Check wideInputPrompt API"]
CheckWideAPI --> WideAvailable{"wideInputPrompt available?"}
WideAvailable --> |Yes| ShowWide["Show wide input box"]
WideAvailable --> |No| ShowNormal["Show normal input box"]
ShowWide --> GetInput1["Get user input"]
ShowNormal --> GetInput2["Get user input"]
GetInput1 --> InputReceived1{"Has input content?"}
GetInput2 --> InputReceived2{"Has input content?"}
InputReceived1 --> |No| ReturnEmpty["Return empty string"]
InputReceived2 --> |No| ReturnEmpty
InputReceived1 --> |Yes| ParsePayload["Parse whether it is a JSON payload"]
InputReceived2 --> |Yes| ParsePayload
ParsePayload --> IsPayload{"Is valid payload?"}
IsPayload --> |Yes| ExtractCode["Extract code field"]
IsPayload --> |No| NormalizeCode["Normalize code"]
ExtractCode --> NormalizeCode
NormalizeCode --> ReturnCode["Return normalized code"]
ReturnEmpty --> End([End])
ReturnCode --> End
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:186-214](file://Scripts/leetcode-quickadd.js#L186-L214)

**Section Sources**
- [Scripts/leetcode-quickadd.js:186-214](file://Scripts/leetcode-quickadd.js#L186-L214)

### JSON Parsing and Validation Mechanism

#### parseLeetCodePayloadText Function Implementation

This function is specifically for parsing the JSON-format payload pasted by the user:

```mermaid
flowchart TD
Start([Start parsing]) --> CheckInput["Check input parameter"]
CheckInput --> InputValid{"Input valid?"}
InputValid --> |No| ReturnNull["Return null"]
InputValid --> |Yes| TrimText["Clean whitespace characters"]
TrimText --> TryParse["Attempt JSON.parse"]
TryParse --> ParseSuccess{"Parse successful?"}
ParseSuccess --> |No| ReturnNull
ParseSuccess --> CheckType["Check payload.type"]
CheckType --> TypeCorrect{"type is leetcode-cn-obsidian?"}
TypeCorrect --> |No| ReturnNull
TypeCorrect --> ReturnPayload["Return valid payload"]
ReturnNull --> End([End])
ReturnPayload --> End
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:216-232](file://Scripts/leetcode-quickadd.js#L216-L232)

**Section Sources**
- [Scripts/leetcode-quickadd.js:216-232](file://Scripts/leetcode-quickadd.js#L216-L232)

### URL Parsing Algorithm

#### extractTitleSlug Function Implementation

This function implements a flexible URL parsing algorithm:

```mermaid
flowchart TD
Start([Start parsing URL]) --> CheckInput["Check input parameter"]
CheckInput --> InputValid{"Input valid?"}
InputValid --> |No| ReturnEmpty["Return empty string"]
InputValid --> TrimInput["Clean input"]
TrimInput --> CheckFullURL["Match full URL pattern"]
CheckFullURL --> FullMatch{"Matches full URL?"}
FullMatch --> |Yes| ExtractFromFull["Extract slug from full URL"]
FullMatch --> |No| CheckPathOnly["Match path pattern"]
CheckPathOnly --> PathMatch{"Matches path pattern?"}
PathMatch --> |Yes| ExtractFromPath["Extract slug from path"]
PathMatch --> |No| CleanInput["Remove slashes"]
ExtractFromFull --> ReturnSlug["Return slug"]
ExtractFromPath --> ReturnSlug
CleanInput --> ReturnSlug
ReturnEmpty --> End([End])
ReturnSlug --> End
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:277-293](file://Scripts/leetcode-quickadd.js#L277-L293)

**Section Sources**
- [Scripts/leetcode-quickadd.js:277-293](file://Scripts/leetcode-quickadd.js#L277-L293)

### Language Normalization Rules

#### normalizeMarkdownLanguage Function Implementation

This function provides complete programming language name normalization:

```mermaid
flowchart TD
Start([Start language normalization]) --> CheckInput["Check input parameter"]
CheckInput --> InputValid{"Input valid?"}
InputValid --> |No| ReturnCpp["Return default cpp"]
InputValid --> |Yes| ConvertLower["Convert to lowercase"]
ConvertLower --> CheckMap["Look up mapping table"]
CheckMap --> Found{"Mapping found?"}
Found --> |Yes| ReturnMapped["Return mapped result"]
Found --> |No| ReturnOriginal["Return original value"]
ReturnCpp --> End([End])
ReturnMapped --> End
ReturnOriginal --> End
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:295-323](file://Scripts/leetcode-quickadd.js#L295-L323)

**Section Sources**
- [Scripts/leetcode-quickadd.js:295-323](file://Scripts/leetcode-quickadd.js#L295-L323)

## Dependency Analysis

The main dependency relationships of the system:

```mermaid
graph TB
subgraph "External Dependencies"
NC[navigator.clipboard API]
GA[GM_setClipboard API]
QAA[QuickAdd API]
end
subgraph "Internal Modules"
GPC[getProblemContext]
RLP[readLeetCodePayloadFromClipboard]
PIP[promptForInput]
PPC[promptForSolutionCode]
PLPT[parseLeetCodePayloadText]
ETS[extractTitleSlug]
NML[normalizeMarkdownLanguage]
GLP[getLeetCodeProblem]
SQA[setQuickAddVariables]
end
GPC --> RLP
GPC --> PIP
GPC --> PPC
GPC --> PLPT
GPC --> ETS
GPC --> NML
GPC --> GLP
GPC --> SQA
RLP --> NC
PPC --> QAA
PIP --> QAA
```

**Diagram Sources**
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)

**Section Sources**
- [Scripts/leetcode-quickadd.js:83-104](file://Scripts/leetcode-quickadd.js#L83-L104)
- [Scripts/leetcode-quickadd.js:238-271](file://Scripts/leetcode-quickadd.js#L238-L271)

## Performance Considerations

### Asynchronous Operation Optimization

The system makes extensive use of Promise and async/await patterns to ensure UI responsiveness:

1. **Non-blocking I/O**: Clipboard reading and network requests are both asynchronous operations
2. **Timeout Handling**: GraphQL API requests have reasonable timeouts configured
3. **Cache Strategy**: Using `cache: "no-cache"` ensures data freshness

### Error Handling Strategy

The system implements a multi-layered error handling mechanism:

1. **API Degradation**: When navigator.clipboard is unavailable, gracefully degrade to other input methods
2. **Input Validation**: Strictly validate and clean all user input
3. **Fallback Mechanism**: Complete fallback process from clipboard to manual input

## Troubleshooting Guide

### Common Issues and Solutions

#### Clipboard Read Failure

**Symptom**: System cannot read LeetCode payload from clipboard

**Possible Causes**:
1. Browser does not support navigator.clipboard API
2. User denied clipboard access permission
3. No valid JSON payload in clipboard

**Resolution Steps**:
1. Check browser compatibility
2. Confirm the clipboard contains a correctly formatted payload
3. Try manually entering the URL or slug

#### URL Parsing Failure

**Symptom**: System cannot extract the correct titleSlug from user input

**Possible Causes**:
1. Entered URL format is incorrect
2. Non-standard slug format was used

**Resolution Steps**:
1. Ensure a complete LeetCode URL is entered
2. Enter the problem slug directly (e.g., "two-sum")
3. Check for special characters in the URL

#### Code Normalization Issues

**Symptom**: Pasted code format is incorrect

**Possible Causes**:
1. Code contains escape characters
2. JSON string format is incorrect

**Resolution Steps**:
1. Ensure the code has no extra escape characters
2. Check JSON format correctness
3. Use a simple code format

**Section Sources**
- [Scripts/leetcode-quickadd.js:267-271](file://Scripts/leetcode-quickadd.js#L267-L271)
- [Scripts/leetcode-quickadd.js:216-232](file://Scripts/leetcode-quickadd.js#L216-L232)

## Conclusion

This input handling mechanism demonstrates excellent software engineering practices:

1. **Multi-layer Fallback Design**: The complete flow from automatic clipboard reading to manual input ensures a high success rate
2. **Robust Error Handling**: Comprehensive exception handling and degradation mechanisms improve user experience
3. **Flexible Data Processing**: Supports multiple input formats and normalization handling
4. **Clear Architecture Design**: Modular design facilitates maintenance and extension

Through the collaboration of the Tampermonkey script and QuickAdd plugin, the system provides users with a seamless LeetCode problem processing experience. Whether professional developers or general users, everyone can easily create high-quality study notes.
