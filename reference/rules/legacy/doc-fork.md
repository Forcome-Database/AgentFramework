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
- `CLAUDE.md` 行数超过 300，即 `legacy/memory-bloat` 也命中它。本块必须等它先跑完 —— 否则会把整份膨胀的文档（含架构图、配置表、踩坑日志）追加进 `AGENTS.md`。顺序由 `REFACTOR.md` 阶段 4 强制，本条是它的兜底。

## Output Target
GENERATION_ONLY

## Rule
- 不要保留两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：`reference/anti-patterns.md` 第 1 条，某爬虫项目的 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；另一项目的两份文件在同一行号给出正面矛盾的指令）。
- 合并方向固定：把 `CLAUDE.md` 的内容并入 `AGENTS.md`，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。
- 不要反向合并 —— 因为 `AGENTS.md` 承载章节结构，把它的内容塞进 `CLAUDE.md` 会丢失骨架。
- **合并是 append-only by section：按二级标题整章追加，永不去重、永不重排、永不消解矛盾。**这三件事都需要理解内容的含义（哪两条重复？某条该进哪一节？两条是不是在互相矛盾？），而自动档只做机械动作。**直接不做它们，动作就变成机械的了。**
- 第一个 `## ` 之前的**文件前言**必须一并追加，作为新章节 `## 来自 CLAUDE.md 的前言` —— 因为它不属于任何章节，按章节追加会把它漏掉（证据：在一个真实老项目上实测，初版按章节追加漏了 2 行前言，被内容保全核对抓出）。
- 不要因为「重复和矛盾会并排出现」而拒绝合并 —— 因为它们**本来就在**，只是分散在两个文件里。追加之后它们在同一个文件里，而分叉的危害恰恰是 agent 会读到过期的那一份（证据：`reference/anti-patterns.md` 第 1 条）。追加之后没有「那一份」了，两种说法都在眼前，优先级由 `meta/constraint-precedence` 处理。

## Verification
- 命令：前置。本块动手前 `git status --short` 必须为空，非空则中止并转入报告。不要依赖 `REFACTOR.md` 阶段 0 的那次检查 —— 它只在整轮开始时跑一次，而本块执行时已在阶段 4，兄弟块可能已经动过文件。
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`。
- 命令：**内容保全核对**。前置成立时工作区干净，`git show HEAD:CLAUDE.md` 即合并前的原文。合并后、提交前跑下面这段，应无输出：

  ```bash
  git show HEAD:CLAUDE.md \
    | grep -vE '^[[:space:]]*(#|$)' \
    | while IFS= read -r line; do
        grep -rFqx -- "$line" AGENTS.md docs/ 2>/dev/null || echo "丢失：$line"
      done
  ```

  - **覆盖全部非标题、非空行**，不只是条目行 —— 因为代码块、表格、散文段落也是内容，丢了同样是数据损失（证据：一个真实老项目的 `CLAUDE.md` 共 682 行，其中 328 行是条目、69 行是标题、96 行是空行，**待核对的是 517 行**。只查条目行的旧版本对其中 189 行——占全文 28% 的架构图、125 行表格、4 个代码块——完全失明，会给出一份「核对通过」的静默数据损失）。
  - **搜索范围是 `AGENTS.md` 加 `docs/`** —— 因为「内容保全」的语义是「没有任何一行被删掉」，不是「全部进了 `AGENTS.md`」。`legacy/memory-bloat` 先跑时会把架构图与踩坑日志搬进 `docs/`，只查 `AGENTS.md` 会把一次**正确**的搬迁报成丢失。
  - 跳过标题行 —— 因为 `# CLAUDE.md` 按定义不可能出现在 `AGENTS.md` 里（那里叫 `# AGENTS.md`），全行核对会让每一次完美的合并都被判为丢失。
  - `-x` 不能省 —— 因为 `grep -Fq` 是子串匹配，一条被追加了例外的规则含有原文子串，子串匹配会判它通过而语义已经反转（证据：`- 多命中凭证一律交人工复核。` 被改成 `- 多命中凭证一律交人工复核。除非置信度大于 0.9，此时自动消歧。`，`grep -Fq` 零输出判定通过；这正是 `reference/anti-patterns.md` 第 1 条那个财务项目的原始案例）。
  - `--` 不能省 —— 因为条目行以 `-` 开头，grep 会把它当选项并报 `unknown option`，整个判定静默失效（证据：`docs/pitfalls.md` 第 4 条）。

  实测（真实老项目，682 行 `CLAUDE.md` + 129 行 `AGENTS.md`）：`memory-bloat` 先搬走 10 个非规则章节到 `docs/`，本块再追加剩下的铁律与维护规范加前言 —— `AGENTS.md` 129 → 205 行（仍低于 300），`CLAUDE.md` 收敛为单行，**517 行待核对，0 行丢失**。

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`comm -12 <(grep '^## ' AGENTS.md | sort) <(grep '^## ' CLAUDE.md | sort)`，其输出即**双来源章节**——追加后这些章节会同时含两份文件的内容。这是机械记账，不做判断，写进报告交人工看。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md
- 动作：先跑 `Verification` 的前置。把 `CLAUDE.md` 的文件前言追加为 `## 来自 CLAUDE.md 的前言`，再按二级标题把每一章整章追加进 `AGENTS.md`（同名章节追加到已有章节末尾，不同名则新建）。正文已搬到 `docs/` 而只留指针的章节跳过。最后把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。提交前跑内容保全核对，有任何一行丢失即 `git checkout -- AGENTS.md CLAUDE.md` 回滚并转入报告。永不去重、永不重排、永不消解矛盾。双来源章节写进报告，交人工看。
