---
id: core/skip-build-verification
category: core
exclusive-with: core/mandatory-test-gate
---

## Applies When
- 用户在初始化时确认：构建、测试与类型检查由用户本人负责。

## Do Not Apply When
- 项目存在 pre-commit 钩子或 CI 门禁，要求本地先通过。
- 用户要求 AI 自行验证。

## Output Target
`## 基本原则`

## Rule
- 每次写完代码不需要检查语法，不需要执行构建或测试，用户会自己做。
- 不要为了「确认一下」而运行构建或全量测试 —— 因为耗时由用户承担，且用户已明确接管该职责。

## Verification
- 自查：本次是否运行了任何构建、测试或类型检查命令？运行了即违反本规则。
- 命令：`ls .husky .pre-commit-config.yaml 2>/dev/null` 应为空。若不为空，说明本规则的前提已不成立，应切换到 `core/mandatory-test-gate`。
