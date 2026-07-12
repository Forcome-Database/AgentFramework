---
id: frontend/anti-over-abstraction
category: frontend
exclusive-with: null
---

## Applies When
- `package.json` 依赖中存在 `react`、`vue` 或 `svelte` 之一。
- 项目是应用，存在路由目录：`pages/`、`views/`、`routes/`，或 Next.js App Router（其必需文件 `layout.tsx` 存在）。判定命令与 `frontend/directory-convention` 相同。

  用 `layout.tsx` 而不是目录名 `app/` 作 App Router 的判据 —— 因为 `app/` 在 Rails 与许多 Python 项目里也是标准目录名（证据：一个真实的 Next.js App Router 项目上验收时，本块与 `frontend/directory-convention` 双双被错误排除，理由是「不存在 `pages/`、`views/` 或 `routes/`」，而该项目的前端确实是 React 应用，只是用了 App Router）。

## Do Not Apply When
- 项目本身是组件库或设计系统，转发与包装组件是其交付物。
- 项目明确采用容器与展示组件分离架构，存在 `containers/` 目录。

## Output Target
`## 前端规范`

## Rule
- 不要新增只做简单转发的组件，例如只 `return <X>{children}</X>` 或只换个名字透传 props —— 因为它增加了一层无行为的间接，读者要多跳一次才能找到真实实现。
- 页面里只有一个主业务组件时直接写在页面入口，不单独拆 `Manager` 组件再传一堆 props。
- 复杂逻辑优先抽成同目录工具函数或小组件。
- 不要在组件里堆无关逻辑 —— 因为它让组件无法被单独理解，也无法被单独测试。
- 代码尽量短小直接，少拆不必要组件，少做多层 props 传递。

## Verification
- 自查：新增的每个组件，它自己有状态、副作用或分支逻辑吗？三者皆无且仅透传，应删除。
- 命令：`grep -rn "return <[A-Z][A-Za-z]*>{children}</" src/` 应无新增命中。
