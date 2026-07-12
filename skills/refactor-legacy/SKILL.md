---
name: refactor-legacy
description: 扫描已有项目的存量文档与结构腐烂，自动整理可逆的文档问题，报告不可逆的代码问题。当用户要求「整理这个老项目」「扫描存量违规」「清理烂摊子文档」「检查 AGENTS.md 与 CLAUDE.md 是否分叉」时使用。需要目标项目已有 AGENTS.md。
---

读取并逐步执行 `${CLAUDE_PLUGIN_ROOT}/REFACTOR.md`。

该文件是唯一事实源，本 skill 不重复其内容。不要凭记忆执行流程 —— 因为手册会更新，而记忆不会。

`REFACTOR.md` 中出现的 `reference/`、`scripts/` 均相对于 `${CLAUDE_PLUGIN_ROOT}`。被扫描与被整理的是目标项目。

执行前先确认目标项目根目录。若用户未指定，默认为当前工作目录。

本 skill 要求目标项目已有 `AGENTS.md`。没有则先运行 `init-agents`。
