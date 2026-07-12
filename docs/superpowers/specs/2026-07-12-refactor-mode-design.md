# 重构模式设计

日期：2026-07-12

## 问题

框架当前只能约束新代码，不能清算旧代码。

26 个规则块的 `Verification` 绝大多数是增量语义——`应无新增命中`、`本次改动`、`新增的 hook`。它们只守住增量不恶化，不管存量。老项目里已有的 200 个透传组件、146KB 的 `CLAUDE.md`、被放弃的空 `repositories/` 目录，框架一概看不见。

`INIT.md` 七个阶段中没有任何一步做现状偏离检测。阶段 7 唯一沾边的产出是报告空目录，且仅此而已。

目标：让框架既能规范新项目，也能整理老项目的存量文档与结构。

## 设计原则

三条，按优先级：

1. **不新建平行素材库。**两套素材库必然分叉，这是 `anti-patterns.md` 第 1 条亲手批判的反模式。
2. **误杀的代价不对称。**漏报一个废弃目录只是没清理干净；误删一个活目录是数据损失。所有分级向保守一侧倾斜。
3. **闸门必须机器可校验。**「只碰文档不碰代码」若只是一句承诺，迟早被自由发挥掉。它必须是 `validate-rules.mjs` 的一条断言。

## 核心洞察

`reference/anti-patterns.md` 已经是一份现成的腐烂清单——8 条，每条带现象、证据、解法。但它当前只被 `INIT.md` 阶段 4 用来「确认生成结果不重蹈覆辙」，是给生成器自检的，从未用于扫描目标项目。

**把它从生成器的自检清单，升格为目标项目的探针库。**

升格后，每条腐烂立刻获得规则块五字段格式白送的两样东西：

- `Applies When`：什么项目有这个病。
- `Do Not Apply When`：**什么情况下这看起来像腐烂，其实是活的。**

后者是防误杀的关键。空目录与「刚被清空、正在重建」的活目录在文件系统上完全同形，但 `git log -1` 能把它们分开——而这条排除条件在现有格式里是免费的。

## 架构

### 规则块：五必需 + 两可选

```markdown
## Legacy Scan          # 可选。存量语义，不带「新增」限定
- 命令：`grep -rn "return <[A-Z][A-Za-z]*>{children}</" src/`

## Remediation          # 可选。有它必须有 Legacy Scan
- 可逆性：报告
- 动作：列出每个透传组件的路径与调用点数量，不删除。
```

`可逆性: 自动` 的块必须额外声明**写作用域**：

```markdown
## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md, docs/pitfalls.md
- 动作：把编号的踩坑条目按原文迁入 docs/pitfalls.md，在约束文件中留一行指针。
```

约束的是**写**的范围，不是**扫**的范围。`Legacy Scan` 按定义只读——阶段 2 禁止任何写操作——所以扫什么无关安全，写什么才是。一个自动档的块完全可以调用 `node scripts/check-docs.mjs` 去探测死链，只要它最终只写 `docs/`。

`可逆性: 报告` 的块不得声明 `作用域`，因为它不写任何文件。

`可逆性` 只有两个合法取值：

| 取值 | 含义 | 举例 |
| --- | --- | --- |
| `自动` | 纯文档、可逆、不碰代码语义 | 补 docs 索引、拆膨胀的约束文件、合并双文件分叉、归档踩坑记录 |
| `报告` | 碰代码或不可逆 | 删目录、改分层、动 SQL、删透传组件 |

**代码层面的存量违规，框架永远只报告不动手。**这是设计上限，不是暂时的保守。

现有 26 个规则块一律不动。两个字段都可选，缺失即「不参与重构扫描」，按需渐进补齐。

### 新增 category：`legacy/`

由 `anti-patterns.md` 升格而来。八条中只升格那些**在目标项目文件系统上留下可扫描痕迹**的；第 5、7、8 条约束的是框架自身的开发行为，留在 `anti-patterns.md` 不动。

| 来源 | 规则块 id | 可逆性 | 扫描依据 |
| --- | --- | --- | --- |
| 反模式 1 双文件内容分叉 | `legacy/doc-fork` | 自动 | `grep -c . CLAUDE.md` > 1 且 `CLAUDE.md` 内容不等于单行 `@AGENTS.md` |
| 反模式 2 记忆文档无限膨胀 | `legacy/memory-bloat` | 自动 | `wc -l AGENTS.md` > 300，或 `AGENTS.md` 中出现编号的踩坑条目 |
| 反模式 3 照抄单一样本 | `legacy/orphan-abstraction` | 报告 | `find . -type d -empty`，再用 `git log -1 --format=%ci` 判活 |
| 反模式 6 第三方知识重复 | `legacy/vendored-knowledge` | 报告 | `AGENTS.md` 或 `CLAUDE.md` 中存在代码块，且块内含 `import`、`require(` 或 `from ... import` |
| （新，非 anti-patterns 来源） | `legacy/doc-index-rot` | 自动 | `docs/` 下 `.md` 数 > 3 但无 `index.md`，或 `check-docs.mjs` 报出死链 |

每条扫描依据都必须是一条能跑的命令。`AGENTS.md` 禁止「合理地」「根据情况」这类措辞，因为它们无法被判定——扫描依据同样受此约束。反模式 6 原文描述的「第三方库用法细节」不可判定，故收敛为可扫描的代理特征：约束文件里的代码块含 import 语句。它会漏掉不带 import 的用法描述，这是为可判定性付出的代价，接受。

`legacy/doc-index-rot` 不在 `anti-patterns.md` 中，但 `docs/ai-doc-index` 规则块与 `check-docs.mjs` 的死链检测已存在，它只是把现成能力接进重构扫描。

`legacy/orphan-abstraction` 压在**报告**档，不自动删。理由：`git log` 判活失败的代价是删掉活代码，与漏报的代价不对称。

### 扫描集

```
扫描集 = (AGENTS.md 里实际选入的规则块 ∩ 带 Legacy Scan 字段的块)  ∪  全部 legacy/ 块
```

左半边保证不产生不适用的噪音——Go 项目不该被扫「Python f-string SQL」。右半边是通用腐烂病，任何项目都得扫。

这把框架「默认排除、无证据不写」的原则从**生成**平移到了**扫描**。老项目重构工具最常见的失败不是漏报，是无差别全量报告：500 条里 400 条不适用，人就再也不看了。

**硬性前置：`AGENTS.md` 必须先存在。**否则无从知道哪些规则被选入。两个 skill 有序——先 `init-agents` 立宪法，再 `refactor-legacy` 清算历史。

## `REFACTOR.md`：六阶段手册

与 `INIT.md` 平级，不侵入生成流程。两个手册通过 `AGENTS.md` 这个产物解耦。

**不并入 `INIT.md` 的理由：**`INIT.md` 阶段 6 明文规定「全部检查只针对阶段 5 记录的生成文件清单」，整套自检体系围绕「我刚生成的文件」建立。重构扫的恰是「我没生成的文件」，语义正交。且 `INIT` 一次性，重构可重复。

### 阶段 0 · 前置

两个硬闸门，任一不过即停：

- `AGENTS.md` 必须存在。不存在则要求用户先跑 `init-agents`，本手册终止。
- `git status --short` 必须为空。

第二条来自 `AGENTS.md` 的「不要回滚或覆盖工作区中已有的用户改动」。工作区脏时动手整理，无法区分「框架改的」与「用户未提交的」。

退出条件：两个闸门均通过。

### 阶段 1 · 确定扫描集

读 `AGENTS.md` 反查选入的规则块 id，并集全部 `legacy/` 块。逐块判定 `Applies When` 与 `Do Not Apply When`。

沿用 `INIT.md` 阶段 2 的判定规则：**默认排除。有疑问时排除。**

退出条件：产出扫描集清单，每项附带选入依据。

### 阶段 2 · 扫描

**本阶段禁止任何写操作。**

跑扫描集中每个块的 `Legacy Scan` 命令。产出偏离清单，每行四列：规则块 id、命中位置、可逆性、`Do Not Apply When` 的排除判定结果。

不写扫描脚本。`AGENTS.md` 的依赖白名单中没有 `node:child_process`，脚本无法执行 shell 命令；而 `INIT.md` 的五道门本来就由 AI 手动执行（只有 `check-docs.mjs` 是脚本）。手册驱动是本框架的既有形态，不为重构破例。

读取 `.agents/refactor-ignore.txt`，其中列出的条目跳过，不计入偏离清单。

退出条件：偏离清单覆盖扫描集全部规则块。

### 阶段 3 · 分级与呈现

按 `Remediation` 的可逆性分成【自动】与【报告】两组。

**完整清单先呈现给用户。**即使【自动】组马上要动手，也须先让用户知道要动什么。

退出条件：用户已看到完整清单。

### 阶段 4 · 执行【自动】组

只动文档。

**每类违规一个 commit**，commit message 写明依据的规则块 id。任何一类改错可单独 revert，不牵连其它。

退出条件：【自动】组全部执行完毕，且记录了完整的改动文件清单。该清单是阶段 5 的唯一扫描范围。

### 阶段 5 · 自检

复用 `INIT.md` 阶段 6 五道门中的三道。全部检查只针对阶段 4 记录的改动文件清单。

1. **路径存在门。**改动后的文档中，每一条肯定句所断言的位置路径，必须 `test -e` 通过。这道门在重构场景比在生成场景更重要——拆分膨胀文档时最容易制造死链。

2. **占位符门。**搜索 `{{`、`TBD`、`<填写`、`<!-- SLOT:` 与大写 T-O-D-O。零残留。**绝不扫描框架根目录下的 `reference/` 与本手册**——这些文件按定义含被禁词字面量，扫描必然自匹配（`anti-patterns.md` 第 5 条）。

3. **溯源门。**每一处改动必须指回某个规则块。凭空的「顺手优化」一律回滚。

再跑 `node scripts/check-docs.mjs <目标项目根目录>`，须返回 0。

互斥门与样例污染门不适用：重构不选互斥对，也不从样例取材。

退出条件：三道门全过，且 `check-docs.mjs` 返回 0。

### 阶段 6 · 报告与沉淀

向用户输出：

1. 阶段 2 的完整偏离清单，含被 `Do Not Apply When` 排除的项及排除依据。
2. 阶段 4 的改动文件清单与 commit 列表。
3. 【报告】组原样交出，每条附规则块 id 与证据位置。
4. 阶段 5 三道门的检查结果。

若某类腐烂在多个项目反复出现，走 `meta/rule-sedimentation` 的回流三判定，抽象成新的 `legacy/` 块。**框架的自进化通道对重构同样开放。**

## 重复运行的噪音抑制

【报告】组的违规不会自动消失。第二次运行会把同样几百条再报一遍，第三次人就不看了。

方案：抑制文件 `.agents/refactor-ignore.txt`，模板置于 `templates/agents-dir/`。用户把「确认不改」的条目写进去，阶段 2 扫描时跳过。

选它而不选「落盘报告、下次只报新增」，是因为它把「这条我不打算改」这个**用户决策**显式记下来，而不是让框架去猜什么是新的。它是最小的状态，且语义明确。

## 校验

`validate-rules.mjs` 新增 `validateRemediation(block)`，四条断言：

1. 有 `Remediation` 必须有 `Legacy Scan`。反之允许——只扫不改是合法的。
2. `可逆性` 只能取 `自动` 或 `报告`。
3. `可逆性: 自动` 必须声明 `作用域`，且其每一项须落在文档白名单内：任意 `.md` 文件，或 `docs/` 下的任何文件。`可逆性: 报告` 不得声明 `作用域`。
4. `legacy/` category 的块，`Do Not Apply When` 至少两条。

断言 3 约束的是**写**的范围而非**扫**的范围。`Legacy Scan` 按定义只读（阶段 2 禁止写操作），扫什么无关安全；`Remediation` 才动文件，它的作用域才是闸门。这个区分不是文字游戏——按扫描命令做黑名单会立刻误杀 `legacy/doc-index-rot`，它标为自动档，却需要调用 `node scripts/check-docs.mjs` 这个 `.mjs` 脚本来探测死链。

断言 4 把防误杀从「希望作者想到了」变成「校验器逼他想」——因为误杀的代价不对称，一条排除条件不足以防住同形误判。

## 测试

按 `anti-patterns.md` 第 7 条，每条新校验必须配一个**断言返回非零**的已知违规夹具：

```
tests/fixtures/invalid-remediation-without-scan/legacy/a.md   # 有 Remediation 无 Legacy Scan
tests/fixtures/invalid-reversibility-value/legacy/b.md        # 可逆性取值非法
tests/fixtures/invalid-auto-scope-escape/legacy/c.md          # 自动档作用域含 src/
tests/fixtures/invalid-legacy-thin-exclusion/legacy/d.md      # legacy/ 块只有一条 Do Not Apply When
tests/fixtures/invalid-empty-legacy-scan/legacy/e.md          # Legacy Scan 标题在但内容为空
tests/fixtures/invalid-auto-scope-missing/legacy/f.md         # 自动档未声明作用域
tests/fixtures/invalid-report-declares-scope/legacy/g.md      # 报告档却声明了作用域

七个夹具，不是四个。`validateRemediation` 有 **6 个可达的报错分支**，四条断言的说法是按语义分的，按分支分是六条。审查时发现其中两个分支零覆盖——「自动档未声明作用域」与「报告档却声明作用域」——补上了 f 和 g。

e 是一个真实缺陷的回归夹具：`block.sections['Legacy Scan']` 只要标题存在就是数组，**空数组在 JS 里是真值**，所以 `if (rem && !scan)` 只能测出「标题缺失」，测不出「标题在、内容为空」。而同文件的 `validateBlock` 早就用对了 `!lines || lines.length === 0`。同一个文件里两种写法，抄错了那个。
```

只测通过路径的检查形同虚设。`validate-rules.mjs` 初版因路径编码问题从不执行、退出码恒为 0，看起来一直在通过。

## 验收

按 `anti-patterns.md` 第 8 条，夹具反映作者的想象力，真实项目反映世界。`check-docs.mjs` 有 8 个单元测试全绿，一碰到 fumadocs 真实项目就报 19 个假死链。

验收必须是：**在一个真实老项目的副本上跑完整的 `refactor-legacy` 六阶段**，且不向被验收仓库写入任何文件。

验收要回答的不是「扫描器跑通了吗」，而是：

> 【自动】组改完的文档，读一遍，愿意 commit 吗？

若答案是「改是改了，但我还得再收拾一遍」，说明可逆性分级划错了，须把那类动作降级到【报告】。

## 改动清单

| 文件 | 动作 |
| --- | --- |
| `reference/rule-block-spec.md` | 加两个可选字段的定义与可逆性取值表 |
| `reference/rules/legacy/*.md` | 新增 5 个规则块 |
| 现有 26 个规则块 | 按需补 `Legacy Scan` / `Remediation`。可渐进，不阻塞本次交付 |
| `REFACTOR.md` | 新增，六阶段手册 |
| `skills/refactor-legacy/SKILL.md` | 新增，入口 |
| `scripts/validate-rules.mjs` | 加 `validateRemediation` |
| `tests/validate-rules.test.mjs` | 加 4 个已知违规夹具 |
| `templates/agents-dir/refactor-ignore.txt` | 新增，抑制文件模板 |
| `.claude-plugin/plugin.json`、`.codex-plugin/plugin.json` | 注册新 skill |
| `AGENTS.md` | 两处：① 加一条「`legacy/` 块必须有两条以上 `Do Not Apply When`」；② 既有的「占位符检查绝不扫描 `reference/` 与 `INIT.md`」须把 `REFACTOR.md` 一并加入排除列表 |
| `README.md` | 加重构模式一节 |
| `docs/evidence.md` | 记录 `legacy/` 块的证据来源 |

`INIT.md` 不在清单中。重构模式完全不侵入生成流程。

## 不做什么

- **不做棘轮基线。**不引入 `legacy-baseline.json` 记录命中数、不禁止数字变大。抑制文件已解决噪音问题，基线文件是额外的维护负担。
- **不自动整理代码。**`可逆性: 自动` 只许碰文档，由校验器断言 3 强制。
- **不生成 backlog 文档。**【报告】组只在阶段 6 输出给用户，不落盘。落盘的文档会随代码变化而腐烂。
