---
id: meta/doc-governance
category: meta
exclusive-with: null
---

## Applies When
- 全部项目，无条件适用。

## Do Not Apply When
- 无。

## Output Target
`## 文档规范`

## Rule
- `AGENTS.md` 是唯一事实源，承载全部规则。
- `CLAUDE.md` 全文仅一行 `@AGENTS.md`。
- 不要维护两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：某财务自动化项目的一次修订，把「多命中凭证按日期自动消歧」改为「一律交人工复核」，理由是自动选错即静默错账。该修订只写进了 `CLAUDE.md`，`AGENTS.md` 至今保留着已被判定为危险的旧规则）。
- 踩坑记录、故障排查、变更明细写入 `docs/pitfalls.md`。
- 不要把踩坑记录追加进 `AGENTS.md` —— 因为只增不减的约束文件会膨胀到无法被有效加载（证据：某项目的 `CLAUDE.md` 十天内从 10KB 增至 146KB，51 条记录漂移成三种格式，顶部状态摘要从未更新已成误导信息）。
- `AGENTS.md` 超过 300 行时停止追加，先按主题拆分到 `docs/` 下。
- 不要为了整齐重排已有条目编号 —— 因为重排会使跨文档交叉引用失效（证据：某项目的贡献指南将编号重排明确列为反模式）。

## Verification
- 命令：`node scripts/check-docs.mjs` 返回 0。
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
