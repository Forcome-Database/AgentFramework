---
id: legacy/orphan-abstraction
category: legacy
exclusive-with: null
---

## Applies When
- 存在空目录，或目录下只有零内容的入口文件如 `__init__.py`、`index.ts`。
- 该目录名属于常见抽象层命名之一：`repositories/`、`repository/`、`crud/`、`adapters/`、`interfaces/`、`abstractions/`。

## Do Not Apply When
- 该目录在 `.gitignore` 中，或是构建产物、缓存、虚拟环境目录。
- 该目录是包的命名空间占位，即父包的 `__init__.py` 或 `index.ts` 中存在对它的 import。
- 该目录在最近 90 天内有 git 提交，说明它在建设中，不是被放弃的。
- 工作区中该目录下有未提交的改动，即 `git status --short -- <dir>` 非空 —— 说明清空正在进行中，不是被放弃的。
- 代码中存在对该目录的 import 引用，即使目录当前为空。

## Output Target
GENERATION_ONLY

## Rule
- 不要自动删除疑似废弃的抽象层目录 —— 因为空目录与「刚被清空、正在重建」的活目录在文件系统上完全同形，判活失败会删掉活代码，而漏报只是没清理干净，两者代价不对称（证据：`find . -type d -empty` 对二者返回完全相同的结果，命令本身不含任何能区分它们的信息）。
- 报告时必须附三项证据：目录路径、最后一次 git 提交时间、import 引用数。缺任一项的报告不足以支撑用户决策 —— 因为仅凭目录名判定会误杀（证据：`reference/anti-patterns.md` 第 3 条记录了某项目遗留的空 `database/repositories/` 目录，证明这类腐烂确实存在；但该条并未给出区分「废弃」与「重建中」的方法，命名本身不含时间信息）。
- 不要因为目录名像抽象层就判定它废弃 —— 因为命名只是线索，`git log` 与 import 引用才是证据。
- 不要只用 `git log` 判活 —— 因为它只读已提交历史，对工作区里未提交的删除完全视而不见：文件两年前提交、今天刚被 rm 掉但没提交，`git log -1 -- <dir>` 照样返回两年前（证据：审查时用一个回溯提交的仓库实测复现，四条排除条件无一命中）。

## Verification
- 自查：本次报告的每个目录，是否都附了最后提交时间与 import 引用检查结果？
- 命令：`git status --short` 中不应出现被删除的目录 —— 本块不执行删除。

## Legacy Scan
- 命令：`find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*"`。
- 命令：`find . -type d -not -path "./.git/*" -not -path "./node_modules/*" | while IFS= read -r d; do n=$(ls -A "$d" | wc -l); if [ "$n" -eq 1 ] && [ ! -s "$d/$(ls -A "$d")" ]; then echo "$d"; fi; done`，列出只含一个零字节文件的目录。
- 命令：对每个命中目录跑 `git log -1 --format=%ci -- <dir>`，取最后提交时间。
- 命令：对每个命中目录跑 `git status --short -- <dir>`，非空即说明清空未提交，该目录正在被改动。
- 命令：对每个命中目录名跑 `grep -rn "<dirname>" . --exclude-dir=.git`，统计 import 引用数。

## Remediation
- 可逆性：报告
- 动作：列出每个目录的路径、最后提交时间、import 引用数。不删除，不移动。
