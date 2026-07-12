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
- `CLAUDE.md` 行数超过 300，即 `legacy/memory-bloat` 也命中它。本块必须等它先跑完 —— 否则要在一份混着架构图、配置表与踩坑日志的文档里做合并判断，判断质量必然差。顺序由 `REFACTOR.md` 阶段 4 强制，本条是它的兜底。

## Output Target
GENERATION_ONLY

## Rule
- 不要保留两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：`reference/anti-patterns.md` 第 1 条，某爬虫项目的 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；另一项目的两份文件在同一行号给出正面矛盾的指令）。
- 合并方向固定：把 `CLAUDE.md` 的内容并入 `AGENTS.md`，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。
- 不要反向合并 —— 因为 `AGENTS.md` 承载章节结构，把它的内容塞进 `CLAUDE.md` 会丢失骨架。
- **该判断的就判断。**哪两条重复、某条该进哪一节、两条是不是在互相矛盾 —— 这些你做得到，去做。不要为了「机械」而把重复条目和矛盾指令原样堆进 `AGENTS.md`：那不是清理，那是把烂摊子换个地方堆。
- **但每一个「没有逐字保留原文」的决定，必须写进 `.agents/refactor-decisions.md`，附原文与理由。** —— 因为一个没被记录的判断，等于没有判断：无从复核，也无从推翻。机器强制的不是「判断对不对」（那需要另一个判断），而是「判断有没有被记录」。
- 不要静默丢弃任何一行 —— 因为静默丢失读起来和「合并得很干净」一模一样（证据：初版核对只覆盖条目行，对一个真实老项目 682 行 `CLAUDE.md` 中 189 行的架构图、表格与代码块完全失明，会给出一份「核对通过」的静默数据损失）。
- 遇到矛盾指令，**两条都保留**，写进 `AGENTS.md` 的 `## 待人工裁决` 一节，并在决策日志中指出。不要自行选一条 —— 因为矛盾意味着某次修订只落到了一份文件上，哪份是新的无法从文件系统判定。
- 不要改写条目的措辞 —— 因为原文里的具体数字与报错信息才是证据，改写会把证据洗掉。确需改写的，必须在决策日志里同时给出改写前后与理由。

## Verification
- 命令：前置。本块动手前 `git status --short` 必须为空，非空则中止并转入报告。不要依赖 `REFACTOR.md` 阶段 0 的那次检查 —— 它只在整轮开始时跑一次，而本块执行时已在阶段 4，兄弟块可能已经动过文件。
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`。
- 命令：**零静默丢失核对**。前置成立时工作区干净，`git show HEAD:CLAUDE.md` 即合并前的原文。合并后、提交前跑下面这段，应无输出：

  ```bash
  git show HEAD:CLAUDE.md \
    | grep -vE '^[[:space:]]*(#|$)' \
    | while IFS= read -r line; do
        grep -rFqx -- "$line" AGENTS.md docs/ 2>/dev/null && continue
        grep -Fq  -- "$line" .agents/refactor-decisions.md 2>/dev/null && continue
        echo "静默丢失：$line"
      done
  ```

  **判据是「要么逐字存在，要么在决策日志里」，不是「必须逐字存在」。**前者允许你去重、改写、消解矛盾——只要你把决定写下来。后者会逼你把重复条目原样堆进 `AGENTS.md`，那不是清理。

  - **覆盖全部非标题、非空行**，不只是条目行 —— 因为代码块、表格、散文段落也是内容（证据：一个真实老项目的 `CLAUDE.md` 共 682 行，其中 328 行是条目、69 行是标题、96 行是空行，**待核对的是 517 行**。只查条目行的旧版本对其中 189 行完全失明）。
  - **搜索范围是 `AGENTS.md` 加 `docs/`** —— 因为「内容保全」的语义是「没有任何一行被删掉且无人知晓」，不是「全部进了 `AGENTS.md`」。`legacy/memory-bloat` 先跑时会把架构图与踩坑日志搬进 `docs/`。
  - 跳过标题行 —— 因为 `# CLAUDE.md` 按定义不可能出现在 `AGENTS.md` 里（那里叫 `# AGENTS.md`）。
  - 决策日志那条用 `grep -Fq`（子串匹配）而非 `-Fqx`（整行匹配）—— 因为原文在日志里是被反引号包起来引用的，不是独立成行。
  - `-x` 在前两条不能省 —— 因为 `grep -Fq` 是子串匹配，一条被追加了例外的规则含有原文子串，子串匹配会判它通过而语义已经反转（证据：`- 多命中凭证一律交人工复核。` 被改成 `- 多命中凭证一律交人工复核。除非置信度大于 0.9，此时自动消歧。`，`grep -Fq` 零输出判定通过；这正是 `reference/anti-patterns.md` 第 1 条那个财务项目的原始案例）。
  - `--` 不能省 —— 因为条目行以 `-` 开头，grep 会把它当选项并报 `unknown option`，整个判定静默失效（证据：`docs/pitfalls.md` 第 4 条）。
- 自查：决策日志里的每一条「理由」，是否具体到能被复核？「与 `AGENTS.md` 第 12 行重复」可以复核；「冗余」不能。

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`comm -12 <(grep '^## ' AGENTS.md | sort) <(grep '^## ' CLAUDE.md | sort)`，其输出即同名章节——合并时它们要归并到一处。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md, .agents/refactor-decisions.md
- 动作：先跑 `Verification` 的前置。逐条读 `CLAUDE.md`，判断每一条：与 `AGENTS.md` 已有条目重复的丢弃，独有的并入语义对应的章节（无对应章节则新建），与已有条目矛盾的两条都保留并写进 `## 待人工裁决`。第一个 `## ` 之前的文件前言一并处理，不要漏（证据：初版按章节追加漏掉了它，被核对抓出）。每一个没有逐字保留原文的决定，写进 `.agents/refactor-decisions.md`。最后把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。提交前跑零静默丢失核对，有任何一行既不在文件里也不在决策日志里，即 `git checkout -- .` 回滚并转入报告。
