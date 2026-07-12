# Agent Framework

一个规则素材库与生成器。它扫描目标项目的真实技术栈，组装出一份专属的 `AGENTS.md`——**里面每一条规则都有文件系统证据支撑，没有一条是编的。**

## 它为什么不是一个模板

模板需要你删掉不适用的部分。而删除比组合更容易出错。

面对一份含 Go 章节的模板，在 Python 项目里，AI 很可能保留「`repository/` 只做数据库访问」这种看似通用其实错误的规则。一条残留的错误规则会持续误导后续所有开发，且极难被发现——因为它读起来完全合理。

所以这里是 31 个带**适用条件**的规则块。`INIT.md` 指导 AI 扫描项目、逐块判定、只写入明确匹配的。**默认排除：没有证据就不写。**

## 安装

### Claude Code 插件（推荐）

```
/plugin marketplace add Forcome-Database/AgentFramework
/plugin install agent-framework@agent-framework
```

然后在任意项目里：

```
/agent-framework:init-agents
```

### Codex

**在 shell 里跑，不是在 Codex 的 TUI 里。**Codex 没有 `/plugin` 这个 slash 命令——它的插件安装是一条 CLI 子命令：

```bash
codex plugin marketplace add Forcome-Database/AgentFramework
```

然后在 Codex 里 `/plugins` 打开插件浏览器，找到 `agent-framework` 装上。**装完要开一个新 session**，插件带的 skill 才会被加载。

调用时用 `@`，不是 `/`：

```
@init-agents
@refactor-legacy
```

仓库同时带两份 marketplace 清单：`.agents/plugins/marketplace.json`（Codex 的当前标准路径）与 `.claude-plugin/marketplace.json`（Claude Code 用，也是 Codex 的 legacy 路径）。两者的 `source` 字段格式不同——Claude Code 用字符串 `"./"`，Codex 要对象 `{"source": "local", "path": "./"}`——所以不能只留一份。

### 任意 AI，零安装

`INIT.md` 是纯 Markdown 执行手册，不依赖任何工具特性。对 Cursor、Gemini CLI 或任何能读文件的 agent 说：

> 读 `https://raw.githubusercontent.com/Forcome-Database/AgentFramework/main/INIT.md` 并执行。

它会告诉 agent 去哪里取规则块。代价是每次运行都要联网，且没有版本锁定。

### 本地开发副本

想让**双向沉淀**真正落地，就得用这种方式：

```
/plugin marketplace add /path/to/your/clone
```

原因见下。

## ⚠️ 双向沉淀与插件缓存的冲突

框架有一个自进化机制：反复踩的坑会被抽象成规则块，**写回** `reference/rules/`，下个项目自动带上。

但插件装完后，`reference/rules/` 位于 `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`。**这个目录在 `/plugin update` 时被整个替换**——回流写进去的规则会无声消失。

所以：

| 你是谁 | 怎么装 | 回流 |
| --- | --- | --- |
| 框架维护者 | marketplace 指向你的 git 工作副本 | 直接 commit，push |
| 使用者 | marketplace 指向 GitHub | 提 PR，或本地 fork |

规则块 `meta/rule-sedimentation` 里写死了这条禁令。

## 它会问你什么

七个阶段里只有阶段 3 需要你参与。**它不会问任何能扫描出来的事**——用什么状态管理库、有没有 TypeScript、后端是什么语言。这些它自己看 `package.json` 和目录树。

它问的是**意图**：

**两个必答题**，构成互斥对，不允许都不选：

1. 项目是否已上线并承载生产数据？
2. 构建和测试由谁验证？选「AI 自己跑」会追问实际命令和量化门槛——它要 `pytest -q` 全绿、当前 150 用例，不接受「确保测试通过」。

**两个选答题：** 前端 hook 放哪；三件套（自进化沉淀 / 文档状态机 / 发版流程）要不要关。

## 五道自检门

生成后逐条验证，任一不过即不交付：

| 门 | 检查 |
| --- | --- |
| 溯源门 | 每条规则都能指回某个规则块或某个用户回答 |
| 路径存在门 | 每条肯定句断言的目录，`test -e` 必须通过 |
| 样例污染门 | 合成样例里的技术栈词汇不得漏进来 |
| 占位符门 | `{{`、`TBD`、`<!-- SLOT:` 零残留 |
| 互斥门 | 两组互斥对各恰好选中一个 |

**路径存在门是性价比最高的一道。** AI 写 `AGENTS.md` 最常见的失败不是规则写错，而是规则本身没问题、但它引用的目录不存在——比如在一个 `app/` 结构的项目里写下「API 请求统一放在 `src/services/api/`」。这条规则会持续误导后续所有开发，且读起来毫无破绽。一条 `test -e` 就能挡住。

## 重构模式

生成器立宪法，重构模式清算历史。两件事，两个 skill：

```
/agent-framework:init-agents      先立宪法，生成 AGENTS.md
/agent-framework:refactor-legacy  再清算历史，扫描存量腐烂
```

有序。`refactor-legacy` 要求 `AGENTS.md` 已存在——它得知道哪些规则被选入了，否则只能全量扫描，而全量扫描会在一个 Go 项目里报出 Python 的规则违规。那是噪音，不是发现。

### 增量语义与存量语义

规则块的 `Verification` 是**增量**的：`应无新增命中`。它只守住新代码不恶化，不管老代码。这不是疏忽——老项目一上来报 500 处违规，AI 会摆烂或乱改一通。

重构模式给规则块加了第二个可选字段 `Legacy Scan`，它是**存量**的：`应无命中`。同一条 grep，去掉「新增」二字。31 个规则块里，5 个属于新增的 `legacy/` 分类，天生带 `Legacy Scan`。

### 一个块写不写文件，看它有没有声明「作用域」

```
Remediation 里有「作用域：...」   → 它会写这些文件，且只能写这些文件
Remediation 里没有「作用域」      → 它一个文件都不写，只报告
```

**这是一个事实，不是一个判断。**

曾经有过一个「可逆性」枚举（自动 / 报告），试图**提前静态地**判定一个动作安不安全。它在开发中翻改了四次——不是想不清楚，是**这个问题在静态层面无解**：安不安全依赖具体项目，不依赖规则。

现在 `legacy/orphan-abstraction` 与 `legacy/vendored-knowledge` 没有作用域，所以它们只报告。理由都是事实，不是猜测：

- `orphan-abstraction`：**git 根本不追踪空目录**，删了就恢复不了。
- `vendored-knowledge`：目的地在仓库之外（skill 或 Context7），框架管不到。

### 该判断的就判断，但必须交账

自动整理不是「只做机械的、不需要理解内容的动作」——**你手里有一个大模型，用它。**

`legacy/memory-bloat` 要逐章读 `CLAUDE.md` 的内容，判断哪章是约束、哪章是踩坑日志、哪章是参考资料。`legacy/doc-fork` 要判断哪两条重复、某条该进哪一节、两条是不是在互相矛盾。**这些判断模型做得到。**

代价是：**每一个「没有逐字保留原文」的决定，必须写进 `.agents/refactor-decisions.md`，附原文与理由。**

```
模型做语义判断（去重、分节、消解矛盾、识别踩坑记录）
    ↓
每一行没被逐字保留的内容 → 决策日志（原文 + 理由）
    ↓
零静默丢失核对：每一行，要么逐字存在于某文件，要么在决策日志里
    ↓
人读决策日志（一屏），不读整个 diff（几百行）
```

**机器强制的不是「判断对不对」**（那需要另一个判断），**是「判断有没有被记录」**。一个没被记录的判断，等于没有判断：无从复核，也无从推翻。

### 走过的弯路

`memory-bloat` 原本有一个动作：把「编号的踩坑条目」迁进 `docs/pitfalls.md`。它在一个真实老项目上命中 22 条编号条目——逐条打开看：**18 条是该项目的铁律治理清单，4 条是 PR 流程步骤，一条踩坑记录都没有。**机械执行会把这个项目的宪法搬进一个叫「历史事实档案」的文件里。

我从这件事学到的第一个教训是「**别让它判断**」。于是删掉了那个动作，把 `doc-fork` 也压成「append-only：整章追加，永不去重、永不消解矛盾」。

**那是错的教训。**

真正的问题从来不是「模型能不能判断」——**验收 agent 当场就分辨出来了**，一条不差。问题是：**模型判断的时候，没有任何东西逼它把判断亮出来。**正则是判断的劣质代理，而流程里没有一步让判断变得显式、可查。

而 append-only 的产物是什么？一个塞满重复条目和并排矛盾指令的 `AGENTS.md`。**那不是清理，那是把烂摊子换个地方堆。**

### 腐烂探针从哪来

`reference/anti-patterns.md` 里那 8 条反模式，本来只被 `INIT.md` 用来自检「别把生成结果写成这样」。重构模式把其中 4 条**在目标项目文件系统上留下可扫描痕迹**的升格成了 `legacy/` 规则块：`doc-fork`、`memory-bloat`、`orphan-abstraction`、`vendored-knowledge`。第 5 个 `doc-index-rot` 不是升格来的——它把 `check-docs.mjs` 已有的死链检测能力直接接进重构扫描，不需要新证据。

升格后它们免费获得了五字段格式的 `Do Not Apply When`——而这在重构场景里是**防误杀机制**：

```markdown
## Do Not Apply When
- 该目录在 .gitignore 中，或是构建产物目录。
- 该目录是包的命名空间占位，父包的 __init__.py 中有对它的 import。
- 该目录在最近 90 天内有 git 提交 —— 说明它在建设中，不是被放弃的。
```

空目录和「刚被清空、正在重建」的活目录在文件系统上完全同形。上面第三条 `git log -1` 把它们分开了。这就是为什么 `legacy/` 块被强制要求至少两条排除条件——**误杀的代价（删掉活代码）远大于漏报的代价（没清理干净）**。

### 四个阶段

```
阶段 0  前置    AGENTS.md 必须存在；工作区必须干净
阶段 1  扫描    禁止任何写操作。逐块判定 Applies When / Do Not Apply When，跑 Legacy Scan
阶段 2  呈现    完整清单给用户看。动手之前，用户必须知道要动什么
阶段 3  执行    只跑声明了作用域的块。每块一个 commit，任何一块改错都能单独 revert
阶段 4  报告    决策日志全文 + 未处理的清单
```

**规则块自己的 `Verification` 就是门。手册不再设阶段级的门。**

一度有过五道阶段级的门（路径存在、占位符、溯源、互斥、不倒退）。删掉了，因为**一个块只对自己的作用域负责**——让它去过一道检查**全局**不变量的门，别的块的病会让它永远过不了。

真实案例：`legacy/doc-index-rot` 的作用域是 `docs/`，它曾被 `CLAUDE.md` 的 transclusion 错误触发（`check-docs.mjs` 返回非零），又被**同一个错误**判定为失败——而那个错误归 `doc-fork` 管、且排在它后面。**死锁。**执行 agent 停在扫描阶段，一个文件都没动。它是对的。

修法是给检查脚本加分项（`--only=doc-index`），让每个块只跑它作用域内的那一项。见 `docs/pitfalls.md` 第 11 条。

## 规则块长什么样

五个字段，缺一不可。`Verification` 把规则从「主张」变成「可判定的检查」。

```markdown
---
id: frontend/design-token-consistency
category: frontend
exclusive-with: null
---

## Applies When
- 项目支持主题切换或暗色模式。特征包括 `dark:` 类名、`ConfigProvider` token、CSS 变量主题、`prefers-color-scheme` 查询。

## Do Not Apply When
- 项目只有单一固定主题。

## Output Target
`## 前端规范`

## Rule
- 颜色一律取自主题 token 或主题 store，其入口由初始化时写入 `## 项目注意事项`。
- 不要硬编码具体颜色值或颜色类名 —— 因为它们不会随主题切换，会造成浅色与深色模式下的视觉断裂。
- 新增按钮、弹窗、浮层时复用已有组件的视觉风格。
- 主题相关配置集中在统一的主题文件或 Provider 中。
- 不要在页面私有组件里自己写主题分支判断 —— 因为分支散落后，改一次主题要改几十处。

## Verification
- 命令：`grep -rnE "(bg|text|border)-(black|white|stone|slate|zinc)-[0-9]" src/` 应无新增命中。
- 自查：本次新增的组件在深色模式下是否被实际查看过？
```

**这段是 `reference/rules/frontend/design-token-consistency.md` 的逐字节原文**，由 `check-consistency.mjs` 的 `checkExampleBlocks` 强制——README 里凡是带 `id:` 的示例，必须与真实文件一致。

这道检查不是多余的：写这一节时，我手打了一段"看起来像"这个规则块的内容并标注「这是真实内容」——`Applies When` 和 `Rule` 全是编的，读起来毫无破绽。**手写的示例绕过了这个框架的每一道门**（溯源门、路径存在门都只管生成物，不管 README）。

**划分判据**：`Applies When`、`Do Not Apply When`、`Output Target` 三者完全相同的规则必须合入同一块。这条由 `validate-rules.mjs` 强制执行，不靠自觉——素材库越大，三元组空间越拥挤，想塞进一个语义重复的块就越难不撞车。

**禁令三段式**：每条以「不要」开头的规则必须写成「不要做 X —— 因为 Y（证据 Z）」。同样由校验器强制。对一个没有共同历史的新 session 而言，「为什么」比「是什么」更能长期存活。

## 规则从哪来

不是从「最佳实践」文章抄的。素材来自对 17 份真实 agent 约束文件与 8 个后端项目实际代码的调研，区分了自研与第三方 fork。

调研推翻了四个初始假设：`{code, data, msg}` 响应封装（8 个项目里只有 2 个用，都是早期的）、`crud/` 仓储层（只有 1 个用，另有一个项目留着空的 `repositories/` 目录）、Alembic 迁移（4 个用 DB 的项目给出 4 种方案）、以及「不做迁移」和「不执行构建」——它们是互斥对，因为两个项目给出了正面相反的默认值。

完整的调研结论、数字与推理过程见 [`docs/evidence.md`](docs/evidence.md)。

## 校验

```bash
npm test                            # 47 个单元测试
node scripts/validate-rules.mjs     # 规则库自检：五字段、三元组唯一、互斥双向、禁令三段式
node scripts/check-docs.mjs         # 文档健康：transclusion、行数预算、死链
node scripts/check-consistency.mjs  # 跨文件事实：数量、档位、id 断链、占位符、prune 模式
```

四个脚本零依赖，只用 Node 内置模块。

`check-consistency.mjs` 守的是**同一个事实散在多处**这件事：规则块数量写在 5 个文件里，`legacy/` 块的档位写在 4 个文件里。改一处忘另一处，就是 `anti-patterns.md` 第 1 条的「双文件内容分叉」—— 而 agent 会捡到过期的那份。

**这个框架自己的开发中，同类分叉发生过十次以上。**它第一次干净运行就抓出一处真实的 prune bug。

每个脚本都有一个「已知违规」的测试用例，断言它返回非零。**只测通过路径的检查形同虚设**——本框架的 `validate-rules.mjs` 初版因路径编码问题从不执行，退出码恒为 0，看起来一直在通过。详见 [`docs/pitfalls.md`](docs/pitfalls.md)。

## 结构

| 路径 | 内容 |
| --- | --- |
| `INIT.md` | 生成器手册，七阶段，每阶段有进入与退出条件 |
| `REFACTOR.md` | 重构手册，六阶段，扫描存量腐烂、整理可逆部分、报告不可逆部分 |
| `reference/rules/` | 31 个规则块（26 个原有 + 5 个 `legacy/` 存量扫描块） |
| `reference/rule-block-spec.md` | 五字段格式与划分判据，另有 `Legacy Scan` / `Remediation` 两个可选字段 |
| `reference/anti-patterns.md` | 8 条已观察到的反模式与证据 |
| `reference/example-AGENTS.md` | 合成样例，风格校准用，描述一个不存在的项目 |
| `templates/` | 骨架文件 |
| `scripts/` | 三个零依赖校验脚本 |
| `docs/index.md` | 文档索引，`docs/` 下文档数超过 3 篇时必需 |
| `docs/evidence.md` | 规则的证据来源 |
| `docs/pitfalls.md` | 本仓库自己的踩坑记录 |

## License

MIT
