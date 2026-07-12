---
id: legacy/doc-index-rot
category: legacy
exclusive-with: null
---

## Applies When
- `docs/` 下的 Markdown 文档数超过 3 篇。
- `node scripts/check-docs.mjs <目标项目根目录> --only=doc-index` 返回非零。该分项只查**索引的完整性与死链**：`docs/` 下每一篇 `.md` 是否都能从 `docs/index.md` 一跳到达、索引里有无死链。

  **必须用 `--only=doc-index`，不能跑全量。**全量还会断言 `CLAUDE.md` 恰为单行、`AGENTS.md` ≤ 300 行 —— 那些不归本块管，却会让本块被一个不属于它的错误触发（证据：`docs/pitfalls.md` 第 11 条）。

## Do Not Apply When
- 项目使用文档站，索引由文档站自身的侧边栏配置生成，即存在 `docs/.vitepress/`、`docusaurus.config.*` 或 `source.config.ts` 之一。
- `docs/` 下的文档全部由本框架的状态机模板生成且从未被追加，即 `docs/` 中只有 `progress/` 与 `overview/` 两个子目录。

## Output Target
GENERATION_ONLY

## Rule
- 文档数超过 3 篇时必须有 `docs/index.md` —— 因为没有索引的文档目录，agent 只能靠文件名猜内容，猜错的成本是读完整篇。
- 新增文档必须在同一次改动中补索引条目 —— 因为分两次提交时，第二次必然被遗忘。
- 不要在索引中写文档站的路由路径，例如 `/docs/overview/quick-start` —— 因为路由路径依赖站点配置，换一套文档站就全断，而 `check-docs.mjs` 会跳过以 `/` 开头的链接（证据：`docs/pitfalls.md` 第 3 条），所以断了也不会被检出。

## Verification
- 命令：`node scripts/check-docs.mjs <目标项目根目录> --only=doc-index` 返回 0。

  **绝不用全量。**本块的作用域是 `docs/`，它修不了 `CLAUDE.md` 的 transclusion，也修不了 `AGENTS.md` 的行数 —— 而全量会因为那些错误返回非零，让本块**永远无法通过自己的 Verification**。这是一个死锁，在一个真实老项目上实测触发过（证据：`docs/pitfalls.md` 第 11 条）。
- 自查：`docs/` 下每一篇文档，是否都能从 `docs/index.md` 一跳到达？

## Legacy Scan
- 命令：`find docs -name "*.md" | wc -l`，超过 3 且 `test -e docs/index.md` 失败即命中。
- 命令：`node scripts/check-docs.mjs <目标项目根目录> --only=doc-index`，返回非零即命中，其输出即未收录的文档与死链清单。

## Remediation
- 可逆性：自动
- 作用域：docs/
- 动作：生成或补全 `docs/index.md`，为每篇未收录的文档加一行条目。修正指向真实存在文件的死链。指向文档站路由的链接不动。
