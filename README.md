# Agent Framework

一个规则素材库与生成器。它扫描目标项目的真实技术栈，组装出一份专属的 `AGENTS.md`——**里面每一条规则都有文件系统证据支撑，没有一条是编的。**

## 它为什么不是一个模板

模板需要你删掉不适用的部分。而删除比组合更容易出错。

面对一份含 Go 章节的模板，在 Python 项目里，AI 很可能保留「`repository/` 只做数据库访问」这种看似通用其实错误的规则。一条残留的错误规则会持续误导后续所有开发，且极难被发现——因为它读起来完全合理。

所以这里是 26 个带**适用条件**的规则块。`INIT.md` 指导 AI 扫描项目、逐块判定、只写入明确匹配的。**默认排除：没有证据就不写。**

## 安装

### Claude Code 插件（推荐）

```
/plugin marketplace add <owner>/agent-framework
/plugin install agent-framework@agent-framework
```

然后在任意项目里：

```
/agent-framework:init-agents
```

### Codex

同一个仓库带 `.codex-plugin/plugin.json`，可直接作为 Codex 插件安装。

### 任意 AI，零安装

`INIT.md` 是纯 Markdown 执行手册，不依赖任何工具特性。对 Cursor、Gemini CLI 或任何能读文件的 agent 说：

> 读 `https://raw.githubusercontent.com/<owner>/agent-framework/main/INIT.md` 并执行。

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

## 规则块长什么样

五个字段，缺一不可。`Verification` 把规则从「主张」变成「可判定的检查」。

```markdown
---
id: frontend/anti-over-abstraction
category: frontend
exclusive-with: null
---

## Applies When
- package.json 依赖中存在 react、vue 或 svelte 之一。
- 项目是应用，存在 pages/、views/ 或 routes/ 目录。

## Do Not Apply When
- 项目本身是组件库或设计系统，转发与包装组件是其交付物。
- 项目明确采用容器与展示组件分离架构，存在 containers/ 目录。

## Output Target
`## 前端规范`

## Rule
- 不要新增只做简单转发的组件，例如只 `return <X>{children}</X>` —— 因为它增加了一层无行为的间接，读者要多跳一次才能找到真实实现。

## Verification
- 命令：`grep -rn "return <[A-Z][A-Za-z]*>{children}</" src/` 应无新增命中。
```

**划分判据**：`Applies When`、`Do Not Apply When`、`Output Target` 三者完全相同的规则必须合入同一块。这条由 `validate-rules.mjs` 强制执行，不靠自觉——素材库越大，三元组空间越拥挤，想塞进一个语义重复的块就越难不撞车。

**禁令三段式**：每条以「不要」开头的规则必须写成「不要做 X —— 因为 Y（证据 Z）」。同样由校验器强制。对一个没有共同历史的新 session 而言，「为什么」比「是什么」更能长期存活。

## 规则从哪来

不是从「最佳实践」文章抄的。素材来自对 17 份真实 agent 约束文件与 8 个后端项目实际代码的调研，区分了自研与第三方 fork。

调研推翻了四个初始假设：`{code, data, msg}` 响应封装（8 个项目里只有 2 个用，都是早期的）、`crud/` 仓储层（只有 1 个用，另有一个项目留着空的 `repositories/` 目录）、Alembic 迁移（4 个用 DB 的项目给出 4 种方案）、以及「不做迁移」和「不执行构建」——它们是互斥对，因为两个项目给出了正面相反的默认值。

完整的调研结论、数字与推理过程见 [`docs/evidence.md`](docs/evidence.md)。

## 校验

```bash
npm test                        # 22 个单元测试
node scripts/validate-rules.mjs # 规则库自检：五字段、三元组唯一、互斥双向、禁令三段式
node scripts/check-docs.mjs     # 文档健康：transclusion、行数预算、死链
```

三个脚本零依赖，只用 Node 内置模块。

每个脚本都有一个「已知违规」的测试用例，断言它返回非零。**只测通过路径的检查形同虚设**——本框架的 `validate-rules.mjs` 初版因路径编码问题从不执行，退出码恒为 0，看起来一直在通过。详见 [`docs/pitfalls.md`](docs/pitfalls.md)。

## 结构

| 路径 | 内容 |
| --- | --- |
| `INIT.md` | 生成器手册，七阶段，每阶段有进入与退出条件 |
| `reference/rules/` | 26 个规则块 |
| `reference/rule-block-spec.md` | 五字段格式与划分判据 |
| `reference/anti-patterns.md` | 8 条已观察到的反模式与证据 |
| `reference/example-AGENTS.md` | 合成样例，风格校准用，描述一个不存在的项目 |
| `templates/` | 骨架文件 |
| `scripts/` | 三个零依赖校验脚本 |
| `docs/evidence.md` | 规则的证据来源 |
| `docs/pitfalls.md` | 本仓库自己的踩坑记录 |

## License

MIT
