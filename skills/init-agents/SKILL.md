---
name: init-agents
description: 为当前项目生成专属的 AGENTS.md 约束体系与配套文件。当用户要求「初始化 agent 框架」「生成 AGENTS.md」「给这个项目配置 AI 开发约束」时使用。会先扫描项目真实技术栈，按条件选取规则块，再组装输出并通过五道自检门。
---

读取并逐步执行 `${CLAUDE_PLUGIN_ROOT}/INIT.md`。

该文件是唯一事实源，本 skill 不重复其内容。不要凭记忆执行流程 —— 因为手册会更新，而记忆不会。

`INIT.md` 中出现的 `reference/`、`templates/`、`scripts/` 均相对于 `${CLAUDE_PLUGIN_ROOT}`。生成物落在目标项目根目录。

执行前先确认目标项目根目录。若用户未指定，默认为当前工作目录。
