---
id: frontend/style-ownership
category: frontend
exclusive-with: null
---

## Applies When
- 项目存在样式方案，例如 `tailwindcss`、CSS Modules、`styled-components`、`emotion`。

## Do Not Apply When
- 项目完全依赖第三方组件库默认样式，无自定义样式层。

## Output Target
`## 前端规范`

## Rule
- 样式优先由组件自己管理。组件私有样式用 Tailwind className 或少量内联 style。
- 不要为单个组件新增大量全局 CSS —— 因为全局 CSS 的作用域是整个应用，单组件样式写在那里会在未来意外命中别处。
- 全局 CSS 只放基础变量、全局重置、跨页面通用样式，以及第三方组件必要的少量覆盖。
- 不要在全局样式文件里堆页面私有样式 —— 因为删除页面时没人敢删对应的样式，它会永久残留。

## Verification
- 自查：本次新增的每一行全局样式，是否满足「基础变量、全局重置、跨页面通用、第三方覆盖」四者之一？
