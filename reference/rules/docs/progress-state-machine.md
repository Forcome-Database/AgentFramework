---
id: docs/progress-state-machine
category: docs
exclusive-with: null
---

## Applies When
- 用户在初始化时未关闭文档状态机。

## Do Not Apply When
- 用户明确关闭了文档状态机。

## Output Target
`## 文档规范`

## Rule
- 后续待办写到 todo 文档。已实现但还需用户测试确认的事项写到 pending-test 文档。用户确认测试通过后再更新 features 文档。三份文档的实际路径由初始化时写入 `## 项目注意事项`。
- 每次 todo 事项完成后，先从 todo 移到 pending-test。
- 不要在用户确认测试通过前把事项写进 features 文档 —— 因为未经验证的功能会让功能说明整体失去可信度。
- 每次任务完成前，都要根据实际变更检查并更新 todo 与 pending-test。即使没有变化，也要确认无需修改。
- 不要在文档里写过期日期 —— 因为没人会回头更新它们，除非用户明确要求记录具体时间。

## Verification
- 自查：本次任务完成前，todo 与 pending-test 是否已按实际变更更新？
- 命令：`git diff --name-only` 若包含功能代码，则应同时包含 pending-test 文档。
