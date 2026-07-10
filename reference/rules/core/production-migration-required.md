---
id: core/production-migration-required
category: core
exclusive-with: core/pre-launch-no-legacy-compat
---

## Applies When
- 用户在初始化时确认：项目已上线并承载生产数据。

## Do Not Apply When
- 项目尚未上线，无任何需要保护的数据。

## Output Target
`## 基本原则`

## Rule
- 改动数据模型必须配套迁移脚本。
- 不要仅凭测试通过就认为 schema 变更安全 —— 因为测试库通常由 `create_all` 或等价机制建立、不读迁移，「测试过」不等于「生产 schema 对」（证据：某已上线项目的 `AGENTS.md` 明确写下这一条）。
- 迁移方案沿用项目既有选择，其具体工具由初始化时写入 `## 项目注意事项`。
- 不要中途更换迁移工具 —— 因为两套版本表并存会让生产库处于无法判定的状态。
- 不要删除或重写历史迁移文件 —— 因为已在生产执行过的迁移一旦改变，回滚与重建都将失去依据。

## Verification
- 命令：改动 ORM 模型后，`git status --short` 应包含迁移目录下的新增文件。
- 自查：迁移脚本是否在一个与生产同 schema 的库上实际执行过？
