
```dataviewjs
const pages = dv.pages()  
.where(p =>  
p.file.folder === "notes/leetcode" &&  
!p.file.name.includes("统计") &&  
String(p.type ?? "").trim() === "leetcode" &&  
String(p.status ?? "").trim() === "done" &&  
p.done_date  
);  
  
function formatDate(dateValue) {  
if (!dateValue) return "未知日期";  
  
// Dataview 日期对象  
if (dateValue.toFormat) {  
return dateValue.toFormat("yyyy-MM-dd");  
}  
  
// Obsidian 属性视图里可能显示成 2026/05/24  
return String(dateValue)  
.replaceAll("/", "-")  
.slice(0, 10);  
}  
  
const groups = pages.groupBy(p => formatDate(p.done_date));  
  
if (pages.length === 0) {  
dv.paragraph("没有找到满足条件的 LeetCode 题解。");  
} else {  
for (const group of groups.sort(g => g.key, "desc")) {  
dv.header(2, `${group.key} ｜完成 ${group.rows.length} 题`);  
  
dv.table(  
["题号", "题目", "难度", "文件"],  
group.rows  
.sort(p => Number(p.lc_id ?? 99999), "asc")  
.map(p => [  
p.lc_id ?? "",  
p.title ?? p.file.name,  
p.difficulty ?? "",  
p.file.link  
])  
);  
}  
}
```














