---
id: backend/python-config-management
category: backend
exclusive-with: null
---

## Applies When
- 项目存在 `requirements.txt` 或 `pyproject.toml`。
- 且项目读取环境变量或 `.env` 文件。

## Do Not Apply When
- 项目无任何环境相关配置。

## Output Target
`## 后端规范`

## Rule
- 环境变量集中由 `pydantic_settings.BaseSettings` 子类管理，统一从 `.env` 读取（证据：调研的 7 个 FastAPI 项目中 4 个如此）。
- 不要在业务代码中散落 `os.getenv` 或 `os.environ` 读取 —— 因为绕过统一入口的配置无法被集中校验，也无法被默认值覆盖。
- 不要在模块顶层实例化 `Settings()` 或调用应用工厂 —— 因为含必填字段的 Settings 会让 import 期间崩溃，测试与 CLI 都无法加载模块（证据：某项目的一次修订，起因是 import 期崩溃）。用 `@lru_cache` 包裹的 `get_settings()` 或工厂函数延迟实例化。
- 启动服务用 `uvicorn.run(..., factory=True)` 配合应用工厂函数。

## Verification
- 命令：`grep -rn "os.environ\[\|os.getenv(" --include=*.py . | grep -v config.py` 应无命中。
- 命令：`grep -rnE "^(app|settings) = " --include=*.py .` 应无命中。
