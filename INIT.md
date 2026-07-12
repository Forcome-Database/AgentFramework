# INIT.md

本文件是一份执行手册，读者是 AI。目标是为一个目标项目生成专属的 `AGENTS.md` 及配套文件。

七个阶段顺序执行。每个阶段有进入条件与退出条件，不满足退出条件不得进入下一阶段。

本手册的每一步都必须可判定。若你发现某一步需要「合理判断」，说明手册有缺陷，停下来告诉用户。

## 术语

- 框架根目录：**本文件（`INIT.md`）所在的目录**。你是从某个绝对路径读到本文件的，那个目录就是框架根目录。不要去解 `${CLAUDE_PLUGIN_ROOT}` 之类的环境变量 —— 它是 Claude Code 专有的，Codex 与其它 agent 不认识它，解不出来就会去找一个不存在的路径。下文所有 `reference/`、`templates/`、`scripts/` 路径均相对于框架根目录。
- 目标项目：要为其生成 `AGENTS.md` 的项目，由用户指定。
- 规则块：框架根目录下的 `reference/rules/<category>/<name>.md`，格式见 `reference/rule-block-spec.md`。
- 目标项目根目录：生成物落盘的地方。下文凡未加「框架根目录」限定的相对路径，均相对于目标项目根目录。

## 阶段 0：前置检查

读取目标项目根目录。

- 若存在 `AGENTS.md`：进入增量更新模式。读取其现有内容。后续只追加缺失的章节与规则，绝不覆盖或删除任何既有条目。
- 若存在 `CLAUDE.md` 且其非空行多于一行：记录一条漂移风险，留到阶段 7 报告。不要在本次运行中自动改写它。
- 若两者均不存在：进入全新生成模式。

退出条件：已明确当前处于增量更新模式还是全新生成模式，且已记录既有 `CLAUDE.md` 的状态。

## 阶段 1：扫描

本阶段禁止任何写操作。

采集下列事实，每一条都必须有文件系统证据：

1. 依赖清单文件是否存在及其内容：`package.json`、`go.mod`、`pyproject.toml`、`requirements.txt`、`Cargo.toml`。
2. 目录树，深度 2。
3. 文档站特征：`docs/content/docs/` 与 `source.config.ts` 是否同时存在；`docs/.vitepress/` 是否存在；`docusaurus.config.*` 是否存在。
4. `docs/` 下的 Markdown 文档数量。
5. git 是否已初始化；`git tag -l` 是否为空。
6. `VERSION`、`CHANGELOG.md` 是否存在。
7. 是否存在 `containers/`、`packages/`、`apps/` 等结构性目录。
8. 是否存在空目录。空目录可能是被放弃的抽象层，留到阶段 7 报告。

   ```bash
   find . -type d -empty      -not -path "*/.git/*" -not -path "*/node_modules/*"      -not -path "*/.next/*" -not -path "*/.swc/*" -not -path "*/.venv/*"
   ```

   **prune 模式必须用 `*/` 前缀，不能用 `./`。**`-not -path "./node_modules/*"` 只排除**顶层**的那一个；monorepo 里 `frontend/node_modules/`、嵌套的 `.git/`、`frontend/.next/` 全部漏网（证据：在一个真实 monorepo 上，`./` 写法报出 14 个空目录，其中 8 个是嵌套的依赖与构建产物目录；`*/` 写法报出 6 个，全部是真实信号）。
9. 是否存在 `.husky/` 或 `.pre-commit-config.yaml`。

退出条件：产出一份事实清单，每条附带证据路径。

## 阶段 2：判定

遍历 `reference/rules/` 下的规则块。

对每一块：

- **若 `category` 为 `legacy`，跳过。**它们是重构模式的腐烂探针，属于 `REFACTOR.md` 的扫描集，不参与生成。它们的 `Remediation` 字段会真的改文件，而本手册不读那个字段 —— 在判定表里显示「选入」是一个危险的假象（证据：在一个真实项目上验收时，`legacy/memory-bloat` 出现在生成阶段的判定表里并标着「选入」，而它有一个会搬移 `CLAUDE.md` 整个章节的动作）。
- 若 frontmatter 的 `exclusive-with` 非 `null`，跳过。互斥对留到阶段 3。
- 否则，逐条比对 `Applies When` 与 `Do Not Apply When`。

判定规则，不容变通：

> **默认排除。** 只有当 `Applies When` 的每一条都能在阶段 1 的事实清单中找到证据，且 `Do Not Apply When` 的每一条都不成立时，才判定为选入。

有疑问时排除，并在阶段 7 报告「因证据不足而排除」。

产出判定表，每行三列：规则块 id、判定、依据。依据必须引用阶段 1 的具体证据，例如「`package.json` 含 `react`；存在 `src/pages/`」。

退出条件：判定表覆盖全部**非 `legacy`、非互斥**的规则块，每行都有依据。

规则库共 31 个规则块：26 个参与生成（本阶段判定），5 个 `legacy/` 块只参与重构扫描（`REFACTOR.md` 阶段 1）。**判定表里不该出现任何 `legacy/` 开头的 id。**

## 阶段 3：提问

**禁止提问下列内容**，它们在阶段 1 已被扫描得到：

- 使用什么状态管理库、包管理器、构建工具。
- 是否使用 TypeScript。
- 后端语言是什么。
- 是否有文档站。
- 是否用 git tag 发过版。

**必须提问下列内容**，两组互斥对各须恰好选中一个，不允许零选或双选：

1. 项目是否已上线并承载生产数据？
   - 未上线，选入 `core/pre-launch-no-legacy-compat`。
   - 已上线，选入 `core/production-migration-required`，并追问当前迁移方案（Alembic、手写版本化 SQL、自制迁移器、启动时 `create_all`），记入 `## 项目注意事项`。
2. 构建与测试验证由谁负责？
   - 用户负责，选入 `core/skip-build-verification`。
   - AI 提交前须自行跑通，选入 `core/mandatory-test-gate`，并追问实际验证命令与量化门槛，例如 `python -m pytest -q` 全绿、当前 150 用例，记入 `## 项目注意事项`。

若阶段 1 发现 `.husky/` 或 `.pre-commit-config.yaml` 存在，在提问第 2 项时先向用户指出这一事实。

**应当提问下列内容**，它们是约定而非事实：

3. 页面私有 hook 放在页面目录还是统一的 `hooks/`？仅当 `frontend/directory-convention` 选入时提问。

4. 三件套是否有需要关闭的？默认全部启用。
   - 自进化沉淀，对应 `meta/rule-sedimentation`。
   - 文档状态机，对应 `docs/progress-state-machine`。
   - 发版流程，对应 `docs/changelog-granularity` 与 `release/tag-release-flow`。

   提问时须如实告知：这套机制在调研的其它项目中未能坚持下来。其中一个无 `CHANGELOG`、无 `VERSION`、`git tag -l` 为空；另一个有 `CHANGELOG` 但已停止维护。

5. 若某个选入的规则块正文中含「由初始化时写入 `## 项目注意事项`」，逐一追问该项的实际值：服务层目录、store 目录、主题入口、状态机三份文档的路径。

退出条件：两组互斥对各恰好一个选中；所有待填的项目事实均已采集。

## 阶段 4：风格校准

读框架根目录的 `reference/example-AGENTS.md`。它是一份合成样例，描述一个不存在的项目，只用于学习规则的颗粒度与语气：每条规则短、带具体示例、可判定。

读框架根目录的 `reference/anti-patterns.md`。确认生成结果不重蹈其中任何一条。

**禁止复制 `reference/example-AGENTS.md` 中的任何条目。** 它是风格参照，不是内容来源。它描述的项目并不存在，其中的路径、技术栈与业务事实全部是虚构的。

退出条件：无产出，仅为下一阶段做准备。

## 阶段 5：生成

以 `templates/AGENTS.skeleton.md` 为骨架。

填充规则：

- `Output Target` 为 `PREAMBLE` 的块，其 `Rule` 正文填入 `<!-- SLOT: PREAMBLE -->`。
- `Output Target` 为章节名的块，其 `Rule` 正文填入同名插槽。
- `Output Target` 为 `GENERATION_ONLY` 的块不填入任何插槽。它约束的是你此刻的写作方式。
- 某章节无任何选入的规则块时，连同标题一起删除。
- `## 项目注意事项` 始终保留，写入阶段 3 采集到的全部项目事实。
- 所有 `<!-- SLOT: ... -->` 标记必须在填充后消失。

同时生成：

- `CLAUDE.md`，内容取自 `templates/CLAUDE.transclusion.md`，恰为一行 `@AGENTS.md`。增量更新模式下，若目标项目已有含实质内容的 `CLAUDE.md`，跳过本项，留到阶段 7 报告。
- `docs/pitfalls.md`，取自 `templates/pitfalls.md`。
- 状态机三份文档，取自 `templates/progress/`，路径与格式按下表决定，命中即停：

  | 探测特征 | 格式 | 路径前缀 |
  | --- | --- | --- |
  | `docs/content/docs/` 且存在 `source.config.ts` | `.mdx` 加 frontmatter | `docs/content/docs/` |
  | 存在 `docs/.vitepress/` | `.md` 加 frontmatter | `docs/` |
  | 存在 `docusaurus.config.*` | `.md` 加 frontmatter | `docs/` |
  | 以上均不命中 | 纯 `.md`，无 frontmatter | `docs/` |

  三份文件固定为 `progress/todo`、`progress/pending-test`、`overview/features`。frontmatter 变体见 `templates/frontmatter/`。

- `CHANGELOG.md` 与 `VERSION`，取自模板。目标项目已存在则跳过。
- `docs/index.md`，仅当阶段 1 数到的文档数量超过 3 篇时生成。
- `.agents/skills-lock.json` 与 `.agents/plugins/marketplace.json`，取自 `templates/agents-dir/`。
- `scripts/check-docs.mjs`，从框架根目录复制。

退出条件：全部文件已写入，且记录了完整的生成文件清单。该清单是阶段 6 的唯一扫描范围。

## 阶段 6：自检

五道门。任一不过即不许交付。全部检查只针对阶段 5 记录的生成文件清单。

1. **溯源门。** `AGENTS.md` 中每一条规则，必须能指回某个规则块的 `Rule` 字段，或指回阶段 3 的某个用户回答。凭空生成的规则一律删除。逐条核对。

2. **路径存在门。** `AGENTS.md` 正文中**每一条肯定句所断言的位置路径**，必须在目标项目中实际存在。逐条用 `test -e` 验证。这是最强的反幻觉门：一条规则可以措辞正确却引用不存在的目录，读起来毫无破绽，却会持续误导后续所有开发。

   只校验肯定句。禁令中的路径按定义就不该存在，例如「不要引入 `crud/` 或 `repository/` 抽象层」，对它们做 `test -e` 会把正确的禁令判为死链。

   规则块正文中的路径是**通用写法**，写入目标项目时必须替换为该项目的真实路径。例如 `services/` 在某个项目里是 `backend/app/services/`。不做替换就无法通过本门。

   **被 `.gitignore` 匹配的路径豁免本门。**因为它们按定义就不在仓库里：`.env` 是运行时文件，仓库里只有 `.env.example`；构建产物、虚拟环境同理。一条正确描述运行时约定的规则（「环境变量统一从 `.env` 读取」）会被本门误判为死链（证据：在一个真实 FastAPI 项目上验收时，`backend/python-config-management` 的 `.env` 正是这样被误报的）。

   **判定命令必须先剥掉尾部斜杠：**

   ```bash
   git check-ignore -q "${路径%/}"     # 返回 0 即被忽略，豁免本门
   ```

   **`%/` 不能省。**`git check-ignore` 对一个**带尾部斜杠且不存在**的路径会给出假阳性——它会去匹配 `.gitignore` 里的一个空行并返回 0。而 `AGENTS.md` 里的目录路径全都带尾部斜杠。不剥掉它，本门会把**每一个不存在的目录**都判为「已被 gitignore，豁免」——**这道门就在它被造出来要治的那个场景里彻底失效了**（证据：`docs/pitfalls.md` 第 10 条，在一个真实项目上实测，`git check-ignore -q "src/services/api/"` 返回 0，而 `git check-ignore -q "src/services/api"` 返回 1）。

   更阴险的是它**依赖目标项目 `.gitignore` 的具体内容**：同一段判定，在一个仓库里正确，在另一个仓库里静默失效。

3. **样例污染门。** 在生成文件清单上搜索 `reference/example-AGENTS.md` 中出现的技术栈词汇与路径：`server/services/`、`web/src/stores/`、`web/src/lib/theme.ts`、PostgreSQL、Zustand。除非目标项目确实使用，须有阶段 1 的依赖清单证据，否则命中即失败。

4. **占位符门。** 在生成文件清单上搜索 `{{`、`TBD`、`<填写`、`<!-- SLOT:`，以及大写的 T-O-D-O。零残留。

   **绝不扫描框架根目录下的 `reference/` 与本文件。** 这些文件按定义含被禁词的字面量，扫描它们必然自匹配。这不是理论风险：本框架的设计文档第一次自检时，`grep` 命中的正是「占位符门」这条规则自己的定义行。

   状态机的待办文档标题用「待办」，文档索引中的链接文本同样用「待办」。不要把它命名为大写的 T-O-D-O —— 因为那会与本门的被禁词字面碰撞，迫使本门增加例外，而每个例外都是一个新漏洞。文件名保持 `todo.md` 小写，不触发本门。

5. **互斥门。** 两组互斥对各恰好选中一个。零选或双选均失败。

再运行 `node scripts/check-docs.mjs <目标项目根目录>`。

**不要要求它返回 0。**判据是：**它输出的每一条错误，都必须是阶段 0 已记录的漂移风险。**

具体地，只有一类错误可以放行：

- `CLAUDE.md 应恰为一行 transclusion，实际有 N 行非空内容` —— **且**阶段 0 确实记录了「存在 `CLAUDE.md` 且其非空行多于一行」的漂移风险。

其余任何错误一律阻断：死链、`AGENTS.md` 超出行数预算、`AGENTS.md` 不存在。它们都是本次生成引入的，必须修掉。

**为什么不能要求返回 0：这是一个死锁。**阶段 0 明令「若存在 `CLAUDE.md` 且其非空行多于一行……**不要在本次运行中自动改写它**」——因为那是用户的既有内容，改写它是一次未经请求的改动。而 `check-docs.mjs` 的 `checkTransclusion` 无条件要求 `CLAUDE.md` 恰为单行 `@AGENTS.md`。两条都对，接在一起就是死的：**任何一个已经有实质 `CLAUDE.md` 的老项目，都永远走不完阶段 6。**

而「已经有实质 `CLAUDE.md` 的老项目」恰恰是本手册最该服务的对象，不是边角情形。

证据：在一个 731 次提交、`CLAUDE.md` 682 行的真实项目上验收，`check-docs.mjs` 从头到尾返回非 0，阶段 6 无法退出。

这条漂移风险留到阶段 7 报告，由用户决定是否把 `CLAUDE.md` 的技术细节合并进 `AGENTS.md`。想让它自动化，用 `refactor-legacy`——但那里 `legacy/doc-fork` 也是**报告档**，因为合并两份约束文件需要理解内容的含义（哪两条重复、某条该进哪一节、是否互相矛盾），这不是机械动作。

退出条件：五道门全过，且 `check-docs.mjs` 的错误全部属于阶段 0 记录的漂移风险。

## 阶段 7：报告

向用户输出：

1. 阶段 2 的完整判定表，含被排除的块及其原因。
2. 阶段 3 两组互斥对的选择结果。
3. 生成的文件清单。
4. 阶段 6 五道门的检查结果。
5. 待确认事项：
   - 既有 `CLAUDE.md` 的漂移风险。若存在，给出建议：把其中的技术细节合并进 `AGENTS.md`，再把 `CLAUDE.md` 改为单行 `@AGENTS.md`。由用户决定是否执行，不要自动改写。
   - 阶段 1 扫描到的空目录。它们可能是被放弃的抽象层。
   - 选入的规则块中，若含「基于单一样本，尚未获得跨项目验证」声明的，即 `backend/go-layering` 与 `backend/node-layering`，原样告知用户。

## 双向沉淀

生成完成后，本框架与目标项目建立了一条回流通道。

当目标项目开发中用户反复提醒同一件事时，执行 `meta/rule-sedimentation` 中的回流三判定。三条全「是」则把规则抽象成新的规则块，补齐五字段，写入框架**git 工作副本**的 `reference/rules/<category>/`，并**在回复中明确告知**已回流的规则块 id。

不要把回流写进插件缓存目录 —— 因为 `~/.claude/plugins/cache/` 下的目录在 `/plugin update` 时被整个替换，写进去的规则会无声消失。

回流后必须运行 `node scripts/validate-rules.mjs`，返回 0 方可提交。

不要静默回流。它会影响未来所有项目。
