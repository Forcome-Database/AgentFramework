---
id: legacy/doc-fork
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目同时存在 `AGENTS.md` 与 `CLAUDE.md`。
- `CLAUDE.md` 的非空行多于一行。

## Do Not Apply When
- `CLAUDE.md` 的唯一非空行是 `@AGENTS.md`，说明它已是引用而非副本。
- 项目根目录不含 `AGENTS.md`，此时 `CLAUDE.md` 是唯一事实源，不构成分叉。
- `CLAUDE.md` 中存在既非条目、又非标题、又非空的行，即 `grep -vE '^[[:space:]]*([-*0-9]|#|$)' CLAUDE.md` 有输出。这类行包括代码块、表格与散文段落。本块的内容保全核对只能核对条目行，对它们完全失明 —— 转入报告档，由人工合并。

## Output Target
GENERATION_ONLY

## Rule
- 不要保留两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：`reference/anti-patterns.md` 第 1 条，某爬虫项目的 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；另一项目的两份文件在同一行号给出正面矛盾的指令）。
- 合并方向固定：把 `CLAUDE.md` 中 `AGENTS.md` 没有的条目并入 `AGENTS.md`，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。
- 不要反向合并 —— 因为 `AGENTS.md` 承载章节结构，把它的内容塞进 `CLAUDE.md` 会丢失骨架。
- 两份文件对同一事项给出矛盾指令时，中止自动合并并报告给用户 —— 因为矛盾意味着某次修订只落到了一份文件上，哪份是新的无法从文件系统判定。
- 内容保全核对只核对条目行，不核对标题与前言 —— 因为 `CLAUDE.md` 的标题 `# CLAUDE.md` 按定义不可能出现在 `AGENTS.md` 里（那里叫 `# AGENTS.md`），全行核对会让每一次完美的合并都被判为丢失并回滚，自动档永远跑不完（证据：初版核对命令在一个逐字并入了全部四条规则的靶子上，报出「丢失：# CLAUDE.md」）。
- 不要在 `CLAUDE.md` 含非条目内容时自动合并 —— 因为核对只覆盖条目行，代码块、表格与散文段落丢了也不报，会得到一份「核对通过」的静默数据损失（证据：一个真实老项目的 `CLAUDE.md` 共 682 行，其中 328 行是条目、69 行是标题、96 行是空行，剩下 **189 行**是架构图、表格与散文——占全文 28%，全部在核对的盲区里。同一批规则块中的 `legacy/vendored-knowledge` 更是直接假定「`CLAUDE.md` 中存在代码块」）。
- 自动档的安全网只覆盖它承诺的东西，所以承诺必须和现实一样宽 —— 因为承诺窄于现实时，差额部分不是「未覆盖」，而是「静默丢失且报告通过」。宁可把整块降级为报告，也不要保留一个对 28% 的内容失明的自动档。
- 核对必须用 `grep -Fqx` 的整行匹配，不要用 `grep -Fq` 的子串匹配 —— 因为一条被追加了例外的规则含有原文子串，子串匹配会判它通过，而语义已经反转（证据：`- 多命中凭证一律交人工复核。` 被改成 `- 多命中凭证一律交人工复核。除非置信度大于 0.9，此时自动消歧。`，`grep -Fq` 零输出判定通过；这正是 `reference/anti-patterns.md` 第 1 条那个财务项目的原始案例）。
- 核对命令中的 `--` 不要省 —— 因为条目行以 `-` 开头，grep 会把它当选项并报 `unknown option`，整个判定静默失效（证据：`docs/pitfalls.md` 第 4 条）。

## Verification
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`。
- 命令：前置。本块动手前 `git status --short` 必须为空，非空则中止并转入报告。不要依赖 `REFACTOR.md` 阶段 0 的那次检查 —— 因为它只在整轮开始时跑一次，而本块执行时已在阶段 4，兄弟块可能已经动过 `CLAUDE.md`（`legacy/memory-bloat` 的作用域就含它）。
- 命令：内容保全核对。前置成立时工作区干净，所以 `git show HEAD:CLAUDE.md` 就是合并前的原文，不必另存备份。合并后、提交前跑下面这段，应无任何输出：
  `git show HEAD:CLAUDE.md | grep -E '^[[:space:]]*[-*0-9]' | while IFS= read -r line; do grep -Fqx -- "$line" AGENTS.md || echo "丢失：$line"; done`

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`grep -vE '^[[:space:]]*([-*0-9]|#|$)' CLAUDE.md`，其输出即核对盲区中的内容。非空则本块不适用，转入报告。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md
- 动作：先跑 `Verification` 的前置，`git status --short` 非空即中止转报告。再把 `CLAUDE.md` 中 `AGENTS.md` 缺失的条目并入对应章节，把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。提交前跑内容保全核对，有任何一条丢失即 `git checkout -- AGENTS.md CLAUDE.md` 回滚并转入报告 —— 前置成立时工作区干净，所以这次回滚只会撤掉本块自己的改动，不会碰到兄弟块未提交的工作。遇到矛盾指令同样中止并转入报告。不另存备份文件 —— 因为写一个未在本作用域中声明的备份文件，等于这个框架的第一个自动档规则块自己绕过了自己的闸门。
