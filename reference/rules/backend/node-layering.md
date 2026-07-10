---
id: backend/node-layering
category: backend
exclusive-with: null
---

## Applies When
- `package.json` 依赖中存在服务端框架，例如 `express`、`fastify`、`@nestjs/core`，或 `nuxt` 且存在 `server/` 目录，或 `next` 且存在 `app/api/`。

## Do Not Apply When
- Node 仅用于前端构建工具链。

## Output Target
`## 后端规范`

## Rule
- 本规则块基于单一样本，尚未获得跨项目验证。初始化时若目标项目结构不同，沿用目标项目既有结构，并通过双向沉淀回流修正本块。
- 鉴权与权限检查收敛到统一中间件或工具函数。
- 新增公开路由时同步更新鉴权白名单（证据：某 Nuxt 项目明确要求「新增公开 API 路径需同步更新鉴权白名单」）。
- 跨子应用共享的类型定义收敛到单一来源文件。
- 不要在多个子应用中重复定义同一份类型 —— 因为它们会各自漂移（证据：某 monorepo 项目明令「禁止在子应用中重复定义共享类型」）。

## Verification
- 自查：新增的公开路由是否已加入鉴权白名单？
- 自查：本次新增的类型，是否已存在于共享类型文件中？
