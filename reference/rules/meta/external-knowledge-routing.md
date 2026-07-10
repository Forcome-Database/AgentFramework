---
id: meta/external-knowledge-routing
category: meta
exclusive-with: null
---

## Applies When
- 环境中可用 Context7、专用 MCP，或项目内 `.agents/skills/` 下已锁定的技能。

## Do Not Apply When
- 完全离线环境，且项目内无任何锁定技能。

## Output Target
`## 外部知识查询`

## Rule
- 使用不熟悉的库、框架或 API 前，按以下优先级查阅文档：一，Context7，覆盖通用开源库；二，专用 MCP，钉钉相关用 `dingtalk-api` MCP，浏览器与选择器问题用 Playwright MCP 实地验证 HTML 结构；三，项目内已锁定的 skill，位于 `.agents/skills/`；四，WebFetch 或抓取，作为兜底。
- 不要凭记忆写第三方库的 API —— 因为训练数据可能落后于当前版本（证据：三个互不相关的项目独立总结出同一条路由规则）。
- 不要把某个第三方库的通用踩坑重复记进多个项目的约束文件 —— 因为它属于该库而非该项目，应收敛到对应 skill（证据：某浏览器自动化库的选择器语法陷阱与反爬配方，在两个项目的 `CLAUDE.md` 中代码几乎逐字相同）。

## Verification
- 自查：本次使用的第三方 API，是否有一条来自上述来源的引用？若无，回到第一步。
