---
id: core/mandatory-test-gate
category: core
exclusive-with: core/skip-build-verification
---

## Applies When
- 用户在初始化时确认：AI 提交前必须自行跑通验证。
- 或项目存在 pre-commit 钩子、CI 门禁。

## Do Not Apply When
- 项目没有任何测试或构建基础设施。
- 用户明确表示自行承担验证职责。

## Output Target
`## 基本原则`

## Rule
- 修 bug 的固定动作序列：写失败测试、运行确认 fail、改代码、运行确认 pass、跑全量回归、提交（证据：某项目记录「所有 4 个 review 修订都是先写测试再改代码定位的」）。
- 提交前必须跑通项目的验证命令并达到量化门槛。命令与门槛由初始化时写入 `## 项目注意事项`。
- 不要用「确保测试通过」这类无法执行的措辞代替具体门槛 —— 因为没有数字就无法自查（证据：某项目写「210/210 单元 + 19/19 e2e 全过」；LobeHub 官方仓库写「After 2 failed fix attempts, stop and ask for help」）。
- 不要在没有失败测试的情况下「看上去对就提交」 —— 因为无法复现的修复无法证明有效。
- 每个检查脚本都必须有一个「已知违规」的测试用例，断言它返回非零。
- 不要只测通过路径 —— 因为一个从不执行断言的检查也会返回 0，看起来像通过（证据：本框架的 `validate-rules.mjs` 初版因路径编码问题从不执行，退出码恒为 0，详见 `docs/pitfalls.md` 第 1 条）。

## Verification
- 命令：`## 项目注意事项` 中记录的验证命令须全绿。
- 自查：本次修复是否先有一个能复现问题的失败测试？
- 自查：本次新增的检查脚本，是否有一个断言其返回非零的测试用例？
