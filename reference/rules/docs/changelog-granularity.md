---
id: docs/changelog-granularity
category: docs
exclusive-with: null
---

## Applies When
- 用户在初始化时未关闭发版流程。
- 项目存在 `CHANGELOG.md`，或初始化时新建了它。

## Do Not Apply When
- 用户明确关闭了发版流程。

## Output Target
`## 文档规范`

## Rule
- pending-test 文档逐条记录本版本实际做了哪些可测试变更。
- `CHANGELOG.md` 的 `Unreleased` 只保留对这些变更的版本级归纳。
- 不要把实现细节逐条照搬进 `CHANGELOG.md` —— 因为 CHANGELOG 面向使用者，实现细节对他们无意义且会淹没真正重要的变更。
- 条目按 `[新增]`、`[调整]`、`[修复]` 分类。

## Verification
- 自查：`Unreleased` 中的每一条，是否是对多条 pending-test 明细的归纳，而非逐条复制？
