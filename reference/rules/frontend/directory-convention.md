---
id: frontend/directory-convention
category: frontend
exclusive-with: null
---

## Applies When
- 项目存在 `pages/`、`views/` 或 `routes/` 目录。

## Do Not Apply When
- 项目是组件库或工具库，无路由页面。

## Output Target
`## 前端规范`

## Rule
- API 请求统一放在服务层目录，全局或跨页面状态统一放在 store 目录。两者的实际路径由初始化时按项目真实结构写入 `## 项目注意事项`。
- 页面按目录组织。页面里只有一个主业务组件时直接写在页面入口。
- 页面私有 hook 放在对应页面目录下。只有多个页面真实复用的 hook 才提升到外层 `hooks/`。
- 页面私有组件放在各自页面目录的 `components/` 下。
- 不要为了单页面使用把组件放进共享目录 —— 因为共享目录会迅速堆满只有一个调用点的组件，让真正的复用组件难以辨认。
- 多个页面重复出现的 UI 副作用动作，例如复制并提示、下载并提示、统一确认弹窗，抽成全局 hook。
- 不要把 UI 副作用动作放进 store —— 因为它们不是需要共享或订阅的状态。

## Verification
- 自查：新增的 hook 是否被两个以上页面调用？否则应放回页面目录。
- 自查：新增到共享 `components/` 的组件，是否有两个以上调用点？
