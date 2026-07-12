# 腐烂靶子

**这不是一个真实项目。**它是 `scripts/exercise-rules.mjs` 的测试靶子——每一种腐烂都是故意种下的，位置与数量已知。

规则块里的 `Legacy Scan` 与 `Verification` 装的是 shell 命令。不在真实文件系统上执行它们，就无法测试它们。这个目录就是那个文件系统。

**种下的腐烂：**

| 腐烂 | 位置 | 哪个规则块该抓到 |
| --- | --- | --- |
| `CLAUDE.md` 超 300 行 | 根目录（307 行） | `legacy/memory-bloat` |
| 双文件分叉 | `AGENTS.md` + 多行 `CLAUDE.md` | `legacy/doc-fork`（但被 >300 行的排除条件挡住，等 memory-bloat 先跑） |
| `docs/` 4 篇无索引 | `docs/` | `legacy/doc-index-rot` |
| 空的抽象层目录 | `backend/app/repositories/` | `legacy/orphan-abstraction` |
| 只含零字节入口的目录 | `src/adapters/__init__.py` | `legacy/orphan-abstraction` |
| 约束文件里的第三方库代码 | `CLAUDE.md` 的 `from playwright...` | `legacy/vendored-knowledge` |

**故意种下的噪音（必须被排除，不得报出）：**

| 噪音 | 位置 | 为什么不该报 |
| --- | --- | --- |
| 嵌套 `node_modules` 下的空目录 | `frontend/node_modules/@scope/` | prune 模式必须用 `*/` 前缀，`./` 只排顶层 |
| `.env` | 不存在，仓库里只有 `.env.example` | 它在 `.gitignore` 里，路径存在门必须豁免它 |

`.gitignore` 与 `.git/` 由 harness 在临时目录里现建 —— 不能把嵌套的 `.git` 提交进本仓库。
