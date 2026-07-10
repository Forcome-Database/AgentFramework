---
id: backend/database-conventions
category: backend
exclusive-with: null
---

## Applies When
- 依赖清单中存在 ORM 或数据库驱动，例如 `sqlalchemy`、`sqlmodel`、`tortoise-orm`、`asyncpg`、`aiomysql`、`aiosqlite`、`gorm.io/gorm`。

## Do Not Apply When
- 项目无持久化，仅做同步、抓取或转换（证据：调研中有两个项目用 JSON 文件落盘，无数据库）。

## Output Target
`## 后端规范`

## Rule
- 持久化模型与传输模型必须物理分离，放在不同文件或不同目录。
- 不要让一个类同时充当 ORM 实体和 API 响应模型 —— 因为持久化字段与对外字段的生命周期不同，混用会导致内部字段意外泄露（证据：调研的 8 个后端项目中，凡有数据库者无一例外做了这个分离）。
- 实体数量少时用 `models.py` 与 `schemas.py` 单文件，多时拆成同名目录，两种都可接受。
- 迁移方案由初始化时确定并写入 `## 项目注意事项`，可选 Alembic、手写版本化 SQL、自制迁移器，或启动时 `create_all` 不做迁移。
- 不要假定项目使用 Alembic —— 因为迁移方案是自由选择（证据：4 个用关系型持久化的项目给出 4 种不同方案：Alembic、手写版本化 SQL、自制迁移器、启动时 `create_all`）。
- SQL 一律参数化，用占位符加参数元组。
- 不要用字符串拼接或 f-string 构造 SQL —— 因为这是注入入口（证据：某项目在其数据访问模块用正则守卫强制拒绝拼接 SQL）。

## Verification
- 命令：`grep -rnE "f\"(SELECT|INSERT|UPDATE|DELETE)" --include=*.py .` 应无命中。
- 自查：ORM 实体文件与传输模型文件是否分离？
