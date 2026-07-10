---
id: core/pre-launch-no-legacy-compat
category: core
exclusive-with: core/production-migration-required
---

## Applies When
- 用户在初始化时确认：项目尚未上线，无生产数据。

## Do Not Apply When
- 项目已上线并承载生产数据。
- 存在需要保护的历史数据，即使规模很小。

## Output Target
`## 基本原则`

## Rule
- 项目尚未上线，不需要兼容旧数据。表结构或字段调整时直接按新设计修改。
- 不要写旧字段兼容分支、数据迁移兜底或删除旧表的清理逻辑 —— 因为没有需要保护的生产数据，这些代码永远不会被执行，是纯负担。

## Verification
- 命令：`git tag -l` 为空且无生产部署记录，可佐证项目未发布。
- 自查：本次 schema 改动是否新增了 migration 文件？若有，说明本规则的前提已不成立，应切换到 `core/production-migration-required`。
