---
id: legacy/vendored-knowledge
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目的 `AGENTS.md` 或 `CLAUDE.md` 中存在代码块。
- 该代码块内含 `import`、`require(` 或 `from ... import` 语句，即它在演示某个第三方库的用法。

## Do Not Apply When
- 该代码块演示的是项目自身模块的用法，即 import 路径是相对路径或项目内包名。
- 该代码块是反例，用于说明不要这么写，其上下文含禁令措辞。
- 项目不存在任何依赖清单文件，即无 `package.json`、`pyproject.toml`、`go.mod`，此时不存在第三方库知识可言。

## Output Target
GENERATION_ONLY

## Rule
- 不要把第三方库的用法知识写进项目约束文件 —— 因为同一个库的踩坑会逐字躺在多个项目里各自独立漂移（证据：`reference/anti-patterns.md` 第 6 条，某浏览器自动化库的选择器陷阱与反爬指纹配方，在两个项目的 `CLAUDE.md` 中代码几乎逐字相同）。
- 库的通用知识收敛到对应的 skill 或 Context7，约束文件只写项目自身的事实。
- 不要整块搬走一段第三方知识 —— 因为其中可能混有项目特有的配置值，那部分必须留在约束文件里。逐行判定。

## Verification
- 自查：约束文件中剩余的每个代码块，其 import 路径是否都指向项目自身模块？
- 命令：`grep -nE "^\s*(import |from .+ import |.+= *require\()" AGENTS.md` 应只命中项目内模块。

## Legacy Scan
- 命令：`grep -nE "^\s*(import |from .+ import |.+= *require\()" AGENTS.md CLAUDE.md`，其输出即命中的代码行。

## Remediation
- 可逆性：报告
- 动作：列出每个命中的代码块位置与它引用的库名，指出应路由到哪个 skill 或 Context7。不删除 —— 因为无法自动判定其中哪些行是项目特有配置。
