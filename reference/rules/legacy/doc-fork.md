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
- 两份文件对同一事项给出矛盾指令时，中止自动合并并报告给用户 —— 因为矛盾意味着某次修订只落到了一份文件上，哪份是新的无法从文件系统判定。

## Verification
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`。
- 命令：内容保全核对。合并前 `cp CLAUDE.md .git/claude-before-merge.md`；合并后跑下面这段，应无任何输出：
  `while IFS= read -r line; do [ -z "$line" ] && continue; grep -Fq -- "$line" AGENTS.md || echo "丢失：$line"; done < .git/claude-before-merge.md`

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md
- 动作：先 `cp CLAUDE.md .git/claude-before-merge.md` 备份。把 `CLAUDE.md` 中 `AGENTS.md` 缺失的条目并入对应章节，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。最后跑 `Verification` 的内容保全核对，有任何一行丢失即回滚全部改动并转入报告。遇到矛盾指令同样中止并转入报告。
