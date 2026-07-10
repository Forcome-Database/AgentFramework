---
id: backend/go-layering
category: backend
exclusive-with: null
---

## Applies When
- 项目根目录存在 `go.mod`。
- 且存在 HTTP 路由注册代码。

## Do Not Apply When
- Go 仅用于构建工具或 CLI，不承载 HTTP 服务。

## Output Target
`## 后端规范`

## Rule
- 本规则块基于单一样本，尚未获得跨项目验证。初始化时若目标项目结构不同，沿用目标项目既有结构，并通过双向沉淀回流修正本块。
- 分层职责：`handler/` 只处理 HTTP 入参、调用 service、返回响应；`service/` 放业务逻辑、默认值、校验、鉴权；`repository/` 只做数据库访问；`model/` 只定义数据结构、枚举和简单模型方法。
- 不要在 `handler/` 里写业务逻辑或直接访问数据库 —— 因为这会让业务规则无法脱离 HTTP 上下文被测试。

## Verification
- 命令：`grep -rn "gorm.io/gorm" handler/` 应无命中。
- 自查：`handler/` 中的函数是否只调用了 `service/` 的方法？
