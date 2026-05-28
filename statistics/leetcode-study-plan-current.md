---
type: leetcode-study-plan-current
active_plan_id: hot100
---

统计页会读取 `active_plan_id`，并在同目录或子目录中查找 `type: leetcode-study-plan-config` 且 `plan_id` 相同的题单配置。

切换题单时只需要修改 `active_plan_id`，也可以运行：

```bash
node tools/switch-study-plan.js hot100 --stats-dir statistics
```
