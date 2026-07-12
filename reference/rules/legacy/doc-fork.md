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

## Output Target
GENERATION_ONLY

## Rule
- 不要保留两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：`reference/anti-patterns.md` 第 1 条，某爬虫项目的 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；另一项目的两份文件在同一行号给出正面矛盾的指令）。
- 合并方向固定：把 `CLAUDE.md` 中 `AGENTS.md` 没有的条目并入 `AGENTS.md`，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。
- 不要反向合并 —— 因为 `AGENTS.md` 承载章节结构，把它的内容塞进 `CLAUDE.md` 会丢失骨架。
- **不要自动合并，本块只报告。** —— 因为合并需要理解内容的含义：哪两条是重复的、某条该进哪一节、两份文件对同一事项是不是在互相矛盾。这三个判断都无法机械做出，而自动档只做机械的、内容保全的动作（证据：一个真实老项目的 `CLAUDE.md` 共 682 行，其中 328 行是条目、69 行是标题、96 行是空行，剩下 **189 行**——占 28%——是架构图、表格与代码块。任何只核对条目行的保全检查都对这 28% 完全失明，会得到一份「核对通过」的静默数据损失；而把核对扩到全部行，则每一次完美的合并都会因为 `# CLAUDE.md` 这个标题不可能出现在 `AGENTS.md` 里而被误判为丢失）。
- 报告时必须给出三样东西：两份文件的差异条目清单、`CLAUDE.md` 中非条目内容（代码块、表格、散文）的行数、以及对同一事项给出矛盾指令的条目对。缺任一项，人工合并就得从头再读一遍两份文件。

## Verification
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`，人工合并完成后应通过。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`，人工合并完成后应通过。
- 命令：**内容保全核对**，供人工合并后自查。合并前工作区必须干净，`git show HEAD:CLAUDE.md` 即原文。应无输出：

  ```bash
  git show HEAD:CLAUDE.md \
    | grep -vE '^[[:space:]]*(#|$)' \
    | while IFS= read -r line; do
        grep -rFqx -- "$line" AGENTS.md docs/ 2>/dev/null || echo "丢失：$line"
      done
  ```

  - **覆盖全部非标题、非空行**，不只是条目行 —— 因为代码块、表格、散文段落也是内容，丢了同样是数据损失（证据：一个真实老项目的 `CLAUDE.md` 共 682 行，其中 328 行是条目、69 行是标题、96 行是空行，**待核对的是 517 行**。只查条目行的旧版本对其中 189 行——占全文 28%的架构图、表格与代码块——完全失明，会给出一份「核对通过」的静默数据损失）。
  - **搜索范围是 `AGENTS.md` 加 `docs/`，不只是 `AGENTS.md`** —— 因为「内容保全」的语义是「没有任何一行被删掉」，不是「全部进了 `AGENTS.md`」。架构图、配置表、踩坑日志的正确去处是 `docs/`，不是约束文件。只查 `AGENTS.md` 会把一次**正确**的搬迁报成丢失。
  - 跳过标题行 —— 因为 `# CLAUDE.md` 这个标题按定义不可能出现在 `AGENTS.md` 里（那里叫 `# AGENTS.md`），全行核对会让每一次完美的合并都被判为丢失。
  - `-x` 不能省 —— 因为 `grep -Fq` 是子串匹配，一条被追加了例外的规则含有原文子串，子串匹配会判它通过而语义已经反转（证据：`- 多命中凭证一律交人工复核。` 被改成 `- 多命中凭证一律交人工复核。除非置信度大于 0.9，此时自动消歧。`，`grep -Fq` 零输出判定通过；这正是 `reference/anti-patterns.md` 第 1 条那个财务项目的原始案例）。
  - `--` 不能省 —— 因为条目行以 `-` 开头，grep 会把它当选项并报 `unknown option`，整个判定静默失效（证据：`docs/pitfalls.md` 第 4 条）。

  实测（真实老项目，682 行 `CLAUDE.md`）：先按二级标题把 10 个非规则章节搬进 `docs/`，再把剩下的铁律与维护规范并入 `AGENTS.md`，`CLAUDE.md` 收敛为单行 —— 517 行待核对，**只报 2 行丢失**，且确是被搬迁脚本漏掉的文件前言。反向测试：删掉一条铁律，立刻被抓出；删掉 `docs/` 下一整章，丢失数从 2 跳到 128。

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`grep -vE '^[[:space:]]*([-*0-9]|#|$)' CLAUDE.md | wc -l`，其输出即非条目内容的行数。这个数字要写进报告——它衡量人工合并的工作量。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：报告
- 动作：列出两份文件的差异条目清单、`CLAUDE.md` 中非条目内容的行数、以及矛盾指令的条目对。指出合并方向（`CLAUDE.md` → `AGENTS.md`，最后把 `CLAUDE.md` 改写为单行 `@AGENTS.md`）。不动任何文件。
