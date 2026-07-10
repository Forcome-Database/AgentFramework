---
id: frontend/design-token-consistency
category: frontend
exclusive-with: null
---

## Applies When
- 项目支持主题切换或暗色模式。特征包括 `dark:` 类名、`ConfigProvider` token、CSS 变量主题、`prefers-color-scheme` 查询。

## Do Not Apply When
- 项目只有单一固定主题。

## Output Target
`## 前端规范`

## Rule
- 颜色一律取自主题 token 或主题 store，其入口由初始化时写入 `## 项目注意事项`。
- 不要硬编码具体颜色值或颜色类名 —— 因为它们不会随主题切换，会造成浅色与深色模式下的视觉断裂。
- 新增按钮、弹窗、浮层时复用已有组件的视觉风格。
- 主题相关配置集中在统一的主题文件或 Provider 中。
- 不要在页面私有组件里自己写主题分支判断 —— 因为分支散落后，改一次主题要改几十处。

## Verification
- 命令：`grep -rnE "(bg|text|border)-(black|white|stone|slate|zinc)-[0-9]" src/` 应无新增命中。
- 自查：本次新增的组件在深色模式下是否被实际查看过？
