---
id: legacy/memory-bloat
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目的 `AGENTS.md` 或 `CLAUDE.md` 行数超过 300。
- 或该文件中出现三条以上编号的踩坑、教训、问题记录条目。

## Do Not Apply When
- 超出 300 行的内容集中在 `## 项目注意事项` 章节，它按定义随项目事实增长，不是膨胀。
- 项目已存在 `docs/pitfalls.md`，且约束文件中的编号踩坑条目数为零，说明沉淀通道已建立并生效。
- 该文件由本框架最近一次 `init-agents` 生成且未经人工追加，即 `git log --oneline -- AGENTS.md` 只有一条提交。

## Output Target
GENERATION_ONLY

## Rule
- 不要让约束文件无限追加 —— 因为它只增不减，直到无法被有效加载（证据：`reference/anti-patterns.md` 第 2 条，某项目的 `CLAUDE.md` 十天内从 10KB 增至 146KB，51 条踩坑记录漂移成三种格式，顶部的「全部阶段完成」在此后上百条记录中从未更新）。
- 踩坑记录迁出到 `docs/pitfalls.md`，按发现时间倒序，条目编号只增不重排。
- 迁出后在约束文件中保留一行指向 `docs/pitfalls.md` 的指针，不保留摘要 —— 因为摘要会与正文分叉，这正是本块要消除的病。
- 不要在迁移时改写踩坑条目的措辞 —— 因为原文中的具体数字与报错信息才是证据，改写会把证据洗掉。

## Verification
- 命令：`test "$(wc -l < AGENTS.md)" -le 300`。
- 自查：`AGENTS.md` 中是否还有编号的踩坑条目？有则未迁完。

## Legacy Scan
- 命令：`wc -l AGENTS.md CLAUDE.md`，任一超过 300 即命中。
- 命令：`grep -nE "^(##+ )?[0-9]+[.、)] " AGENTS.md`，其输出即疑似编号条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md, docs/
- 动作：分两种情形。① 存在编号的踩坑条目：按原文迁入 `docs/pitfalls.md`，编号续用该文件现有的最大编号加一，不重排既有条目，在约束文件中留一行指向 `docs/pitfalls.md` 的指针。② 无编号条目但行数仍超 300：按主题把章节拆分到 `docs/` 下，约束文件中每个被拆走的章节留一行指针。两种情形都不改写原文措辞。
