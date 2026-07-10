---
id: backend/python-fastapi-layering
category: backend
exclusive-with: null
---

## Applies When
- `requirements.txt` 或 `pyproject.toml` 中存在 `fastapi`。

## Do Not Apply When
- 项目为单文件脚本，或对外端点少于 3 个。此时允许全部写在 `main.py`（证据：调研中规模最小的那个项目，`app/` 完全扁平，无 `routers/`、无 `services/`）。

## Output Target
`## 后端规范`

## Rule
- 业务逻辑放在 `services/`，路由函数保持薄，只做参数校验、调用 service、返回（证据：调研的 7 个 FastAPI 项目中 6 个如此）。
- 启停钩子用 `@asynccontextmanager async def lifespan(app)`，传入 `FastAPI(lifespan=...)`。
- 不要使用 `@app.on_event` —— 因为它已被 FastAPI 废弃（证据：调研的 7 个 FastAPI 项目中 6 个已改用 `lifespan`）。
- HTTP 层目录命名 `api/` 或 `routers/` 均可，项目内保持一致。
- 不要中途更换 HTTP 层目录命名 —— 因为两种命名并存会让新代码无处安放（证据：`api/` 与 `routers/` 在调研的项目中呈 4 比 2 分布，无压倒性优势，属自由选择）。
- 不要引入 `crud/` 或 `repository/` 抽象层 —— 因为除非有明确的跨 service 复用需求，它在实践中会被放弃（证据：调研的 8 个后端项目中仅 1 个使用泛型 CRUD 基类；另有 1 个项目留下了空的 `database/repositories/` 目录，是引入后放弃的直接证据）。
- 不要给成功响应套 `{code, data, msg}` 封装 —— 因为类型化的 Pydantic `response_model` 能被 OpenAPI 与客户端直接消费，而封装会抹掉类型（证据：调研的 5 个近期 FastAPI 项目全部直接返回 `response_model`，错误用原生 `HTTPException`；仅 2 个早期项目使用响应封装）。
- 资源路由文件达到 5 个以上时，用一个 `api_router = APIRouter()` 聚合文件统一 `include_router`，再在 `main.py` 一次性挂载（证据：调研中的两个多资源后端项目）。

## Verification
- 命令：`grep -rn "@app.on_event" .` 应无命中。
- 命令：`find . -type d -name repositories -empty` 应无命中。
- 自查：路由函数体是否超过 15 行？超过则业务逻辑应下沉到 `services/`。
