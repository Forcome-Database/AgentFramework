---
id: release/tag-release-flow
category: release
exclusive-with: null
---

## Applies When
- 用户在初始化时未关闭发版流程。
- 项目已初始化 git。

## Do Not Apply When
- 用户明确关闭了发版流程。
- 项目通过包管理器发布，版本号由 `package.json` 或 `pyproject.toml` 单独管理，无独立 `VERSION` 文件。

## Output Target
`## 发版本流程`

## Rule
- 发版本时，先把 `CHANGELOG.md` 的 `Unreleased` 变更整理成新的版本记录，并保留空的 `Unreleased` 标题。
- 按当前版本号提升一个版本，更新根目录 `VERSION`。
- 将当前未提交的代码全部提交到 Git。
- 提交完成后，给当前提交打最新版本号对应的 tag，例如 `v0.0.5`。
- 不要在发版流程中执行编译、测试或构建 —— 因为发版是打标动作，验证应在此之前完成，除非用户明确要求。

## Verification
- 命令：`git tag -l` 的最新 tag 应与 `VERSION` 文件内容一致。
- 命令：`grep -A1 "^## Unreleased" CHANGELOG.md` 的下一行应为空行。
