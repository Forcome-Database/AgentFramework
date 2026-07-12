# 重构模式实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让框架在生成 `AGENTS.md` 之外，还能扫描老项目的存量文档与结构腐烂，自动整理可逆的文档问题，报告不可逆的代码问题。

**Architecture:** 不新建平行素材库。规则块从五必需字段扩展为「五必需 + 两可选」（`Legacy Scan` / `Remediation`），新增 `legacy/` category 承载由 `reference/anti-patterns.md` 升格而来的腐烂探针。新增 `REFACTOR.md` 六阶段手册与 `refactor-legacy` skill，与 `INIT.md` / `init-agents` 平级，通过 `AGENTS.md` 这个产物解耦。

**Tech Stack:** Node.js 内置模块（`node:fs`、`node:path`、`node:url`、`node:test`、`node:assert/strict`）。Markdown。无第三方依赖。

**Spec:** `docs/superpowers/specs/2026-07-12-refactor-mode-design.md`

## Global Constraints

- 脚本零依赖，仅允许 `node:crypto`、`node:fs`、`node:path`、`node:url`、`node:test`、`node:assert/strict` 与全局 `fetch`。**不得引入 `node:child_process`。**
- 判断脚本是否被直接调用时，必须用 `node:url` 的 `fileURLToPath` 解析 `import.meta.url`。
- 每次改动规则库后必须运行 `node scripts/validate-rules.mjs`，返回 0 方可提交。
- 规则块的 `id` 只增不改。
- 禁令必须写成三段式：不要做 X —— 因为 Y（证据 Z）。由 `validate-rules.mjs` 强制。
- 禁止使用「合理地」「适当地」「根据情况」这类无法判定的措辞。
- 每个检查脚本必须有一个「已知违规」的测试用例，断言它返回非零。只测通过路径的检查形同虚设。
- 不要改无关文件，不要顺手重构。
- `AGENTS.md` 超过 300 行时停止追加，先按主题拆分到 `docs/` 下。
- `可逆性: 自动` 的写作用域白名单：`docs/` 前缀、`*.md`、`AGENTS.md`、`CLAUDE.md`、`CHANGELOG.md`。

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| `scripts/validate-rules.mjs` | 新增 `validateRemediation(block)`，校验两个可选字段。现有 `parseRuleBlock` **无需改动**——它按 `## ` 头收集 sections 到通用 map，新字段自动被收进去 |
| `tests/validate-rules.test.mjs` | 新增 4 个已知违规测试 |
| `tests/fixtures/invalid-*/legacy/*.md` | 4 个违规夹具 |
| `reference/rule-block-spec.md` | 两个可选字段的格式定义与写作用域白名单 |
| `reference/rules/legacy/*.md` | 5 个腐烂探针规则块 |
| `REFACTOR.md` | 六阶段手册，AI 读它执行重构 |
| `skills/refactor-legacy/SKILL.md` | skill 入口，只做转发 |
| `templates/agents-dir/refactor-ignore.txt` | 抑制文件模板 |
| `AGENTS.md` | 两处追加：`legacy/` 块的排除条件下限；占位符检查的排除列表加 `REFACTOR.md` |
| `.codex-plugin/plugin.json` | 更新描述与 defaultPrompt（skill 由 `"skills": "./skills/"` 自动发现，无需逐个注册） |
| `.claude-plugin/plugin.json` | 更新描述（skill 自动发现） |
| `README.md` | 新增「重构模式」一节 |
| `docs/evidence.md` | 记录 5 个 `legacy/` 块的证据来源 |

`INIT.md` 不改动。重构模式完全不侵入生成流程。

---

## Task 1: 校验器支持两个可选字段

先做校验器，因为 Task 2 的 5 个规则块必须通过它。TDD：先写 4 个失败测试，再实现。

**Files:**
- Modify: `scripts/validate-rules.mjs`
- Test: `tests/validate-rules.test.mjs`
- Create: `tests/fixtures/invalid-remediation-without-scan/legacy/a.md`
- Create: `tests/fixtures/invalid-reversibility-value/legacy/b.md`
- Create: `tests/fixtures/invalid-auto-scope-escape/legacy/c.md`
- Create: `tests/fixtures/invalid-legacy-thin-exclusion/legacy/d.md`

**Interfaces:**
- Consumes: `parseRuleBlock(text, relPath)` 返回的 `block` 对象，含 `{ relPath, id, category, exclusiveWith, hasExclusiveKey, sections }`。`sections` 是 `Record<string, string[]>`，键是 `## ` 标题，值是该标题下的非空行数组（已 `trimEnd`）。
- Produces: `validateRemediation(block) -> string[]`，返回错误消息数组。被 `runValidation(rulesDir)` 通过 `blocks.flatMap(validateRemediation)` 调用。

- [ ] **Step 1: 建 4 个违规夹具**

`tests/fixtures/invalid-remediation-without-scan/legacy/a.md`——有 `Remediation` 但无 `Legacy Scan`。注意它有两条 `Do Not Apply When`，以免同时触发断言 4 而让错误数变成 2：

```markdown
---
id: legacy/a
category: legacy
exclusive-with: null
---

## Applies When
- 条件甲成立。

## Do Not Apply When
- 条件乙成立。
- 条件丙成立。

## Output Target
GENERATION_ONLY

## Rule
- 做正面的事。

## Verification
- 命令：`true`

## Remediation
- 可逆性：报告
- 动作：列出命中项。
```

`tests/fixtures/invalid-reversibility-value/legacy/b.md`——可逆性取了非法值：

```markdown
---
id: legacy/b
category: legacy
exclusive-with: null
---

## Applies When
- 条件甲成立。

## Do Not Apply When
- 条件乙成立。
- 条件丙成立。

## Output Target
GENERATION_ONLY

## Rule
- 做正面的事。

## Verification
- 命令：`true`

## Legacy Scan
- 命令：`true`

## Remediation
- 可逆性：也许
- 动作：列出命中项。
```

`tests/fixtures/invalid-auto-scope-escape/legacy/c.md`——可逆性为自动，但作用域含 `src/`，逃出文档白名单：

```markdown
---
id: legacy/c
category: legacy
exclusive-with: null
---

## Applies When
- 条件甲成立。

## Do Not Apply When
- 条件乙成立。
- 条件丙成立。

## Output Target
GENERATION_ONLY

## Rule
- 做正面的事。

## Verification
- 命令：`true`

## Legacy Scan
- 命令：`true`

## Remediation
- 可逆性：自动
- 作用域：docs/index.md, src/components/
- 动作：改文档，顺手改组件。
```

`tests/fixtures/invalid-legacy-thin-exclusion/legacy/d.md`——`legacy/` 块只有一条 `Do Not Apply When`。不带 `Legacy Scan` / `Remediation`，以隔离断言 4：

```markdown
---
id: legacy/d
category: legacy
exclusive-with: null
---

## Applies When
- 条件甲成立。

## Do Not Apply When
- 条件乙成立。

## Output Target
GENERATION_ONLY

## Rule
- 做正面的事。

## Verification
- 命令：`true`
```

- [ ] **Step 2: 写 4 个失败测试**

追加到 `tests/validate-rules.test.mjs` 末尾（保留文件现有的 6 个测试与 import）：

```javascript
test('有 Remediation 但缺 Legacy Scan 被拒绝', () => {
  const errors = runValidation(fixture('invalid-remediation-without-scan'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/a\.md/)
  assert.match(errors[0], /Legacy Scan/)
})

test('非法可逆性取值被拒绝', () => {
  const errors = runValidation(fixture('invalid-reversibility-value'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/b\.md/)
  assert.match(errors[0], /可逆性/)
})

test('自动档作用域逃出文档白名单被拒绝', () => {
  const errors = runValidation(fixture('invalid-auto-scope-escape'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/c\.md/)
  assert.match(errors[0], /作用域/)
})

test('legacy 块排除条件不足两条被拒绝', () => {
  const errors = runValidation(fixture('invalid-legacy-thin-exclusion'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/d\.md/)
  assert.match(errors[0], /Do Not Apply When/)
})
```

- [ ] **Step 3: 跑测试，确认它们失败**

```bash
npm test
```

期望：4 个新测试 FAIL。失败原因是 `assert.equal(errors.length, 1)` 收到 `0`——校验器还不认识这些字段，一条错误都报不出来。

**必须用 `npm test`（即裸 `node --test`），不要写 `node --test tests/`。**后者在 Node 22 会把 `tests` 当成一个测试文件去执行，输出 `# tests 1 / # fail 1`——真正的测试一个都没跑，而报错看起来像「有一个测试挂了」。这是 `docs/pitfalls.md` 第 2 条已经记录过的坑。

**如果它们意外 PASS，停下来。**那说明 `runValidation` 报了错但报错原因不是你以为的那条（比如夹具写错了 frontmatter），测试是假绿的。

- [ ] **Step 4: 实现 validateRemediation**

在 `scripts/validate-rules.mjs` 中，`validateExclusivePairs` 函数之后、`loadBlocks` 之前插入：

```javascript
// 可逆性为「自动」的块只许写文档。约束的是「写」的范围，不是「扫」的范围：
// Legacy Scan 按定义只读（REFACTOR.md 阶段 2 禁止写操作），扫什么无关安全。
const DOC_SCOPE = /^(docs\/|AGENTS\.md$|CLAUDE\.md$|CHANGELOG\.md$|\*\.md$)/

export function validateRemediation (block) {
  const errors = []
  const { relPath } = block
  const scan = block.sections['Legacy Scan']
  const rem = block.sections.Remediation

  if (rem && !scan) {
    errors.push(`${relPath}: 有 Remediation 却无 Legacy Scan —— 无扫描依据的整理动作无从触发`)
  }

  let reversibility = null
  if (rem) {
    const line = rem.find((l) => l.includes('可逆性'))
    const m = line && line.match(/可逆性[：:]\s*(\S+)/)
    reversibility = m ? m[1] : null
    if (reversibility !== '自动' && reversibility !== '报告') {
      errors.push(`${relPath}: Remediation 的可逆性须为「自动」或「报告」，实际为：${reversibility ?? '缺失'}`)
    }

    const scopeLine = rem.find((l) => l.includes('作用域'))
    const scopeRaw = scopeLine && scopeLine.match(/作用域[：:]\s*(.+)$/)
    const scopes = scopeRaw ? scopeRaw[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean) : []

    if (reversibility === '自动') {
      if (scopes.length === 0) {
        errors.push(`${relPath}: 可逆性为「自动」的块必须声明作用域 —— 不声明写哪里，就无法判定它是否只碰文档`)
      }
      for (const s of scopes) {
        if (!DOC_SCOPE.test(s)) {
          errors.push(`${relPath}: 自动档的作用域 ${s} 不在文档白名单内 —— 自动档只许写文档，代码永远只报告`)
        }
      }
    } else if (reversibility === '报告' && scopes.length > 0) {
      errors.push(`${relPath}: 可逆性为「报告」的块不得声明作用域 —— 因为它不写任何文件`)
    }
  }

  if (block.category === 'legacy') {
    const exclusions = (block.sections['Do Not Apply When'] || []).filter((l) => /^-\s/.test(l))
    if (exclusions.length < 2) {
      errors.push(`${relPath}: legacy/ 块的 Do Not Apply When 至少两条 —— 误杀不可逆，一条排除条件不足以防住同形误判`)
    }
  }

  return errors
}
```

再把它接进 `runValidation`：

```javascript
export function runValidation (rulesDir) {
  const blocks = loadBlocks(rulesDir)
  return [
    ...blocks.flatMap(validateBlock),
    ...blocks.flatMap(validateRemediation),
    ...validatePartition(blocks),
    ...validateExclusivePairs(blocks)
  ]
}
```

- [ ] **Step 5: 跑测试，确认全绿**

```bash
npm test
```

期望：26 个测试全过（原 22 个 + 新 4 个）。

- [ ] **Step 6: 确认现有 26 个规则块没被新校验误伤**

```bash
node scripts/validate-rules.mjs
```

期望：`✓ 26 个规则块全部通过`，退出码 0。

现有块都没有 `Remediation`、`Legacy Scan`，也都不是 `legacy` category，所以新增的四条断言对它们全部短路，一条错误都不该报。**若这里报错，说明 `validateRemediation` 的短路逻辑写错了**——比如把「缺 Remediation」当成了错误。

- [ ] **Step 7: 提交**

```bash
git add scripts/validate-rules.mjs tests/validate-rules.test.mjs tests/fixtures/invalid-remediation-without-scan tests/fixtures/invalid-reversibility-value tests/fixtures/invalid-auto-scope-escape tests/fixtures/invalid-legacy-thin-exclusion
git commit -m "校验器：支持 Legacy Scan 与 Remediation 两个可选字段

四条断言：Remediation 蕴含 Legacy Scan；可逆性取值受限；自动档必须声明
写作用域且落在文档白名单内；legacy/ 块的排除条件至少两条。

每条断言配一个断言返回非零的已知违规夹具。"
```

---

## Task 2: 五个 legacy/ 规则块

**Files:**
- Create: `reference/rules/legacy/doc-fork.md`
- Create: `reference/rules/legacy/memory-bloat.md`
- Create: `reference/rules/legacy/orphan-abstraction.md`
- Create: `reference/rules/legacy/vendored-knowledge.md`
- Create: `reference/rules/legacy/doc-index-rot.md`

**Interfaces:**
- Consumes: Task 1 的 `validateRemediation`。这 5 个块必须通过它——它们是这套断言的第一批真实用户。
- Produces: 5 个规则块 id，被 `REFACTOR.md` 阶段 1 的扫描集引用：`legacy/doc-fork`、`legacy/memory-bloat`、`legacy/orphan-abstraction`、`legacy/vendored-knowledge`、`legacy/doc-index-rot`。

- [ ] **Step 1: 写 legacy/doc-fork**

```markdown
---
id: legacy/doc-fork
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目同时存在 `AGENTS.md` 与 `CLAUDE.md`。
- `CLAUDE.md` 的非空行多于一行。

## Do Not Apply When
- `CLAUDE.md` 的唯一非空行是 `@AGENTS.md`，说明它已是引用而非副本。
- 项目根目录不含 `AGENTS.md`，此时 `CLAUDE.md` 是唯一事实源，不构成分叉。
- 两份文件内容逐字节相同，说明是同步副本而非分叉，按 `meta/doc-governance` 处理即可。

## Output Target
GENERATION_ONLY

## Rule
- 不要保留两份都含技术细节的约束文件 —— 因为它们必然分叉，而 agent 会捡到过期的那份（证据：`reference/anti-patterns.md` 第 1 条，某爬虫项目的 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；另一项目的两份文件在同一行号给出正面矛盾的指令）。
- 合并方向固定：把 `CLAUDE.md` 中 `AGENTS.md` 没有的条目并入 `AGENTS.md`，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。
- 不要反向合并 —— 因为 `AGENTS.md` 承载章节结构，把它的内容塞进 `CLAUDE.md` 会丢失骨架。
- 两份文件对同一事项给出矛盾指令时，中止自动合并并报告给用户 —— 因为矛盾意味着某次修订只落到了一份文件上，哪份是新的无法从文件系统判定。

## Verification
- 命令：`test "$(grep -c . CLAUDE.md)" -eq 1`。
- 命令：`grep -q '^@AGENTS.md$' CLAUDE.md`。

## Legacy Scan
- 命令：`grep -c . CLAUDE.md`，大于 1 即命中。
- 命令：`diff AGENTS.md CLAUDE.md`，其输出即两份文件的差异条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md
- 动作：把 `CLAUDE.md` 中 `AGENTS.md` 缺失的条目并入对应章节，再把 `CLAUDE.md` 改写为单行 `@AGENTS.md`。遇到矛盾指令则中止本块，转入报告。
```

- [ ] **Step 2: 写 legacy/memory-bloat**

```markdown
---
id: legacy/memory-bloat
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目的 `AGENTS.md` 或 `CLAUDE.md` 行数超过 300。
- 或该文件中出现三条以上编号的踩坑、教训、问题记录条目。

## Do Not Apply When
- 超出 300 行的内容集中在 `## 项目注意事项` 章节，它按定义随项目事实增长，不是膨胀。
- 项目已存在 `docs/pitfalls.md`，且约束文件中的编号踩坑条目数为零，说明沉淀通道已建立并生效。
- 该文件由本框架最近一次 `init-agents` 生成且未经人工追加，即 `git log --oneline -- AGENTS.md` 只有一条提交。

## Output Target
GENERATION_ONLY

## Rule
- 不要让约束文件无限追加 —— 因为它只增不减，直到无法被有效加载（证据：`reference/anti-patterns.md` 第 2 条，某项目的 `CLAUDE.md` 十天内从 10KB 增至 146KB，51 条踩坑记录漂移成三种格式，顶部的「全部阶段完成」在此后上百条记录中从未更新）。
- 踩坑记录迁出到 `docs/pitfalls.md`，按发现时间倒序，条目编号只增不重排。
- 迁出后在约束文件中保留一行指向 `docs/pitfalls.md` 的指针，不保留摘要 —— 因为摘要会与正文分叉，这正是本块要消除的病。
- 不要在迁移时改写踩坑条目的措辞 —— 因为原文中的具体数字与报错信息才是证据，改写会把证据洗掉。

## Verification
- 命令：`test "$(wc -l < AGENTS.md)" -le 300`。
- 自查：`AGENTS.md` 中是否还有编号的踩坑条目？有则未迁完。

## Legacy Scan
- 命令：`wc -l AGENTS.md CLAUDE.md`，任一超过 300 即命中。
- 命令：`grep -nE "^(##+ )?[0-9]+[.、)] " AGENTS.md`，其输出即疑似编号条目清单。

## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, CLAUDE.md, docs/pitfalls.md
- 动作：把编号的踩坑条目按原文迁入 `docs/pitfalls.md`，在约束文件中留一行指针。不改写条目措辞。
```

- [ ] **Step 3: 写 legacy/orphan-abstraction**

```markdown
---
id: legacy/orphan-abstraction
category: legacy
exclusive-with: null
---

## Applies When
- 存在空目录，或目录下只有零内容的入口文件如 `__init__.py`、`index.ts`。
- 该目录名属于常见抽象层命名之一：`repositories/`、`repository/`、`crud/`、`adapters/`、`interfaces/`、`abstractions/`。

## Do Not Apply When
- 该目录在 `.gitignore` 中，或是构建产物、缓存、虚拟环境目录。
- 该目录是包的命名空间占位，即父包的 `__init__.py` 或 `index.ts` 中存在对它的 import。
- 该目录在最近 90 天内有 git 提交，说明它在建设中，不是被放弃的。
- 代码中存在对该目录的 import 引用，即使目录当前为空。

## Output Target
GENERATION_ONLY

## Rule
- 不要自动删除疑似废弃的抽象层目录 —— 因为空目录与「刚被清空、正在重建」的活目录在文件系统上完全同形，判活失败的代价是删掉活代码，与漏报的代价不对称（证据：`reference/anti-patterns.md` 第 3 条，某项目遗留空的 `database/repositories/`，是引入抽象层后放弃的痕迹；但同一形态也可能是重构中间态）。
- 报告时必须附三项证据：目录路径、最后一次 git 提交时间、import 引用数。缺任一项的报告不足以支撑用户决策。
- 不要因为目录名像抽象层就判定它废弃 —— 因为命名只是线索，`git log` 与 import 引用才是证据。

## Verification
- 自查：本次报告的每个目录，是否都附了最后提交时间与 import 引用检查结果？
- 命令：`git status --short` 中不应出现被删除的目录 —— 本块不执行删除。

## Legacy Scan
- 命令：`find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*"`。
- 命令：对每个命中目录跑 `git log -1 --format=%ci -- <dir>`，取最后提交时间。
- 命令：对每个命中目录名跑 `grep -rn "<dirname>" . --exclude-dir=.git`，统计 import 引用数。

## Remediation
- 可逆性：报告
- 动作：列出每个目录的路径、最后提交时间、import 引用数。不删除，不移动。
```

- [ ] **Step 4: 写 legacy/vendored-knowledge**

```markdown
---
id: legacy/vendored-knowledge
category: legacy
exclusive-with: null
---

## Applies When
- 目标项目的 `AGENTS.md` 或 `CLAUDE.md` 中存在代码块。
- 该代码块内含 `import`、`require(` 或 `from ... import` 语句，即它在演示某个第三方库的用法。

## Do Not Apply When
- 该代码块演示的是项目自身模块的用法，即 import 路径是相对路径或项目内包名。
- 该代码块是反例，用于说明不要这么写，其上下文含禁令措辞。
- 项目不存在任何依赖清单文件，即无 `package.json`、`pyproject.toml`、`go.mod`，此时不存在第三方库知识可言。

## Output Target
GENERATION_ONLY

## Rule
- 不要把第三方库的用法知识写进项目约束文件 —— 因为同一个库的踩坑会逐字躺在多个项目里各自独立漂移（证据：`reference/anti-patterns.md` 第 6 条，某浏览器自动化库的选择器陷阱与反爬指纹配方，在两个项目的 `CLAUDE.md` 中代码几乎逐字相同）。
- 库的通用知识收敛到对应的 skill 或 Context7，约束文件只写项目自身的事实。
- 不要整块搬走一段第三方知识 —— 因为其中可能混有项目特有的配置值，那部分必须留在约束文件里。逐行判定。

## Verification
- 自查：约束文件中剩余的每个代码块，其 import 路径是否都指向项目自身模块？
- 命令：`grep -nE "^\s*(import |from .+ import |.+= *require\()" AGENTS.md` 应只命中项目内模块。

## Legacy Scan
- 命令：`grep -nE "^\s*(import |from .+ import |.+= *require\()" AGENTS.md CLAUDE.md`，其输出即命中的代码行。

## Remediation
- 可逆性：报告
- 动作：列出每个命中的代码块位置与它引用的库名，指出应路由到哪个 skill 或 Context7。不删除 —— 因为无法自动判定其中哪些行是项目特有配置。
```

- [ ] **Step 5: 写 legacy/doc-index-rot**

```markdown
---
id: legacy/doc-index-rot
category: legacy
exclusive-with: null
---

## Applies When
- `docs/` 下的 Markdown 文档数超过 3 篇。
- 不存在 `docs/index.md`，或 `node scripts/check-docs.mjs` 返回非零。

## Do Not Apply When
- 项目使用文档站，索引由文档站自身的侧边栏配置生成，即存在 `docs/.vitepress/`、`docusaurus.config.*` 或 `source.config.ts` 之一。
- `docs/` 下的文档全部由本框架的状态机模板生成且从未被追加，即 `docs/` 中只有 `progress/` 与 `overview/` 两个子目录。
- 报出的死链指向的是文档站路由而非文件系统路径，例如 `/docs/overview/quick-start` —— 这不是死链，是 `check-docs.mjs` 的已知假阳性（证据：`docs/pitfalls.md` 第 3 条，某 fumadocs 项目上报出 19 个假死链）。

## Output Target
GENERATION_ONLY

## Rule
- 文档数超过 3 篇时必须有 `docs/index.md` —— 因为没有索引的文档目录，agent 只能靠文件名猜内容，猜错的成本是读完整篇。
- 新增文档必须在同一次改动中补索引条目 —— 因为分两次提交时，第二次必然被遗忘。
- 不要在索引中写文档站的路由路径 —— 因为 `check-docs.mjs` 按文件系统路径校验，路由路径会被判为死链（证据：某 fumadocs 项目上报出 19 个假死链）。

## Verification
- 命令：`node scripts/check-docs.mjs` 返回 0。
- 自查：`docs/` 下每一篇文档，是否都能从 `docs/index.md` 一跳到达？

## Legacy Scan
- 命令：`find docs -name "*.md" | wc -l`，超过 3 且 `test -e docs/index.md` 失败即命中。
- 命令：`node scripts/check-docs.mjs`，返回非零即命中，其输出即死链清单。

## Remediation
- 可逆性：自动
- 作用域：docs/
- 动作：生成或补全 `docs/index.md`，为每篇未收录的文档加一行条目。修正指向真实存在文件的死链。指向文档站路由的链接不动。
```

- [ ] **Step 6: 跑校验器**

```bash
node scripts/validate-rules.mjs
```

期望：`✓ 31 个规则块全部通过`，退出码 0。

**盯住三件事：**
1. `legacy/doc-index-rot` 的作用域是 `docs/`，必须通过 `DOC_SCOPE` 正则。若报「不在文档白名单内」，说明 Task 1 的正则写错了。
2. 5 个块每个都有至少 2 条 `Do Not Apply When`。
3. 3 个 `报告` 档的块都**没有**声明 `作用域`。

- [ ] **Step 7: 跑全部测试，确认没有回归**

```bash
npm test
```

期望：26 个测试全过。

- [ ] **Step 8: 提交**

```bash
git add reference/rules/legacy/
git commit -m "新增 legacy/ 规则块：五个腐烂探针

由 reference/anti-patterns.md 第 1、2、3、6 条升格而来，另加 doc-index-rot。
anti-patterns 第 5、7、8 条约束的是框架自身开发行为，不在目标项目留下可扫描
痕迹，不升格。

doc-fork / memory-bloat / doc-index-rot 为自动档，只写文档。
orphan-abstraction / vendored-knowledge 为报告档 —— 前者判活失败会删掉活代码，
后者无法自动区分项目特有配置。"
```

---

## Task 3: 格式规范与 AGENTS.md

**Files:**
- Modify: `reference/rule-block-spec.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1 的四条断言、Task 2 的 5 个块作为示例来源。
- Produces: 无代码接口。这是文档任务，让后来者知道两个可选字段怎么写。

- [ ] **Step 1: 在 rule-block-spec.md 的「五个字段」表后追加两个可选字段**

在 `reference/rule-block-spec.md` 中，现有的五字段表格之后、`## frontmatter` 之前插入：

```markdown
## 两个可选字段

供重构模式使用。缺失即「本块不参与存量扫描」。`INIT.md` 完全不读这两个字段。

| 字段 | 语义 | 强制 |
| --- | --- | --- |
| `Legacy Scan` | 扫存量的命令。**存量语义，不带「新增」限定** | 否 |
| `Remediation` | 扫到之后做什么。有它必须有 `Legacy Scan` | 否 |

`Verification` 与 `Legacy Scan` 的区别是语义，不是格式：

- `Verification` 是**增量**的：`应无新增命中`、`本次改动`、`新增的 hook`。它守住增量不恶化。
- `Legacy Scan` 是**存量**的：`应无命中`。它清算历史。

同一条规则可以同时有两者。例如 `frontend/anti-over-abstraction` 的 `Verification` 是「`grep ... src/` 应无新增命中」，它的 `Legacy Scan` 就是同一条 grep 去掉「新增」二字。

### Remediation 的两个可逆性档位

```
## Remediation
- 可逆性：自动
- 作用域：AGENTS.md, docs/pitfalls.md
- 动作：把编号的踩坑条目按原文迁入 docs/pitfalls.md。
```

| 取值 | 含义 | 是否须声明作用域 |
| --- | --- | --- |
| `自动` | AI 直接动手。只许写文档 | 必须，且每项须落在文档白名单内 |
| `报告` | 只列清单交给用户，不动文件 | 不得声明 —— 因为它不写任何文件 |

文档白名单：`docs/` 前缀、`*.md`、`AGENTS.md`、`CLAUDE.md`、`CHANGELOG.md`。

**作用域约束的是「写」的范围，不是「扫」的范围。** `Legacy Scan` 按定义只读——`REFACTOR.md` 阶段 2 禁止任何写操作——所以它扫什么无关安全。一个自动档的块完全可以调用 `node scripts/check-docs.mjs` 去探测死链，只要它最终只写 `docs/`。

以上由 `scripts/validate-rules.mjs` 的 `validateRemediation` 强制。

### legacy/ category 的额外要求

`legacy/` 下的块，`Do Not Apply When` 至少两条。

理由：这类块判定的是「某个东西是不是腐烂」，而腐烂与健康常常同形——空目录既可能是被放弃的抽象层，也可能是刚清空正在重建的活目录。误杀的代价（删掉活代码）远大于漏报的代价（没清理干净）。一条排除条件不足以防住同形误判。

同样由 `validateRemediation` 强制。
```

- [ ] **Step 2: 把 legacy 加进 rule-block-spec.md 的 category 枚举**

`reference/rule-block-spec.md` 的 `## frontmatter` 一节里有这一行：

```
category: <core|meta|backend|frontend|docs|release>
```

改为：

```
category: <core|meta|backend|frontend|docs|release|legacy>
```

**这一步不能漏。**校验器不检查 category 的取值（`validateBlock` 只断言 `id === category/basename`），所以枚举写错不会让任何测试变红。规则库的格式文档写错，比代码写错更隐蔽——后来者照着枚举写新块，会以为 `legacy` 不合法。

- [ ] **Step 3: 在 AGENTS.md 的「规则块约束」一节追加一条**

在 `AGENTS.md` 的 `## 规则块约束` 一节，紧接在「五个字段必须齐全」那条之后插入：

```markdown
- `legacy/` 分类下的规则块，`Do Not Apply When` 至少两条 —— 因为腐烂与健康常常同形（空目录既可能是废弃抽象层，也可能是正在重建的活目录），误杀的代价远大于漏报，一条排除条件挡不住同形误判。
- 标为 `可逆性：自动` 的规则块必须声明 `作用域`，且每项落在文档白名单内 —— 因为自动档会让 AI 直接动手，不划定写的边界就等于允许它改代码。
```

- [ ] **Step 4: 修正 AGENTS.md 的占位符排除列表**

`AGENTS.md` 的 `## 项目注意事项` 中现有这一条：

```
- 占位符检查绝不扫描 `reference/` 与 `INIT.md` —— 因为这些文件按定义含被禁词字面量，扫描必然自匹配。
```

改为：

```
- 占位符检查绝不扫描 `reference/`、`INIT.md` 与 `REFACTOR.md` —— 因为这些文件按定义含被禁词字面量，扫描必然自匹配。
```

**这一条不能漏。** `REFACTOR.md` 阶段 5 要定义占位符门，就必须在正文里写出 `{{`、`TBD`、`<!-- SLOT:` 这些字面量。不把它加进排除列表，第一次跑重构模式就会命中手册自己——这正是 `anti-patterns.md` 第 5 条记录的、本框架已经踩过一次的坑。

- [ ] **Step 5: 跑文档健康检查**

```bash
node scripts/check-docs.mjs
```

期望：`✓ 文档健康检查通过`，退出码 0。

- [ ] **Step 6: 确认 AGENTS.md 没有超过 300 行**

```bash
wc -l AGENTS.md
```

期望：不超过 300。`AGENTS.md` 自己的规则是「超过 300 行时停止追加，先按主题拆分到 `docs/` 下」。若这次追加把它推过 300 行，**先拆分再继续**，不要装作没看见——本框架对自身的约束必须至少和它施加给别人的一样严格。

- [ ] **Step 7: 提交**

```bash
git add reference/rule-block-spec.md AGENTS.md
git commit -m "格式规范：两个可选字段与 legacy/ 的排除条件下限

rule-block-spec.md 补 Legacy Scan / Remediation 的定义、可逆性两档、
文档白名单。AGENTS.md 补两条规则块约束，并把 REFACTOR.md 加入占位符
检查的排除列表 —— 手册要定义禁什么，就必然含被禁词字面量。"
```

---

## Task 4: REFACTOR.md 六阶段手册

**Files:**
- Create: `REFACTOR.md`

**Interfaces:**
- Consumes: Task 2 的 5 个 `legacy/` 块 id；`INIT.md` 阶段 6 的五道门中的三道（路径存在门、占位符门、溯源门）。
- Produces: 一份 AI 可逐步执行的手册。被 Task 5 的 `skills/refactor-legacy/SKILL.md` 转发。

- [ ] **Step 1: 写 REFACTOR.md**

```markdown
# REFACTOR.md

本文件是一份执行手册，读者是 AI。目标是扫描一个已有项目的存量文档与结构腐烂，自动整理可逆的部分，报告不可逆的部分。

六个阶段顺序执行。每个阶段有进入条件与退出条件，不满足退出条件不得进入下一阶段。

本手册的每一步都必须可判定。若你发现某一步需要「合理判断」，说明手册有缺陷，停下来告诉用户。

本手册不生成 `AGENTS.md`。生成走 `INIT.md`。两份手册通过 `AGENTS.md` 这个产物解耦，互不侵入。

## 术语

- 框架根目录：本文件所在的目录。作为 Claude Code 插件安装时它等于 `${CLAUDE_PLUGIN_ROOT}`。下文所有 `reference/`、`scripts/` 路径均相对于框架根目录。
- 目标项目：要被整理的项目。下文凡未加「框架根目录」限定的相对路径，均相对于目标项目根目录。
- 自动档 / 报告档：规则块 `Remediation` 字段中 `可逆性` 的两个取值。

## 阶段 0：前置

两个硬闸门，任一不过即终止本手册。

1. **`AGENTS.md` 必须存在于目标项目根目录。**不存在则告诉用户先运行 `init-agents`，然后停止。

   理由：阶段 1 要从 `AGENTS.md` 反查哪些规则块被选入。没有它就无从确定扫描集，只能全量扫描，而全量扫描会在一个 Go 项目里报出 Python 的规则违规——那是噪音，不是发现。

2. **`git status --short` 必须为空。**不为空则列出脏文件，告诉用户先提交或暂存，然后停止。

   理由：工作区脏的时候动手整理，就无法区分「框架改的」和「用户没提交的」。这直接来自 `AGENTS.md` 的「不要回滚或覆盖工作区中已有的用户改动」。

退出条件：两个闸门均通过。

## 阶段 1：确定扫描集

扫描集由两部分并集而成：

1. **`AGENTS.md` 中实际选入的规则块** ∩ **带 `Legacy Scan` 字段的块**。

   怎么反查：读目标项目的 `AGENTS.md`，逐条比对框架根目录 `reference/rules/` 下各块的 `Rule` 正文。能对上的即为选入。对不上的一律不选——**默认排除。**

2. **全部 `legacy/` 块。**它们是通用腐烂病，任何项目都要扫，不依赖 `AGENTS.md` 的选入结果。

对扫描集中每一块，逐条比对其 `Applies When` 与 `Do Not Apply When`。判定规则与 `INIT.md` 阶段 2 相同：

> **默认排除。** 只有当 `Applies When` 每一条都在目标项目中找到证据，且 `Do Not Apply When` 每一条都不成立时，才判定为选入。有疑问时排除。

`Do Not Apply When` 在本手册中的语义与生成时不同：生成时它是「这条规则不适用于你的项目」，扫描时它是「这个看起来像腐烂的东西其实是活的」。**逐条跑它，不要跳过。**它是唯一的防误杀机制。

退出条件：产出扫描集清单，每项附选入依据与 `Do Not Apply When` 的逐条判定结果。

## 阶段 2：扫描

**本阶段禁止任何写操作。**

先读目标项目的 `.agents/refactor-ignore.txt`。若存在，其中列出的条目在本阶段跳过，不计入偏离清单。文件不存在则视为空。

对扫描集中每一块，执行其 `Legacy Scan` 字段的命令。

不写扫描脚本，直接跑命令。理由：`AGENTS.md` 的依赖白名单中没有 `node:child_process`，脚本无法执行 shell 命令；而 `INIT.md` 的五道门本来就由 AI 手动执行。手册驱动是本框架的既有形态。

产出偏离清单，每行四列：

| 规则块 id | 命中位置 | 可逆性 | 排除判定 |
| --- | --- | --- | --- |

退出条件：偏离清单覆盖扫描集全部规则块。零命中的块也要在清单中列出，标注「无命中」。

## 阶段 3：分级与呈现

按各块 `Remediation` 的 `可逆性` 把偏离清单分成两组：

- **【自动】组**：`可逆性：自动`。将在阶段 4 动手。
- **【报告】组**：`可逆性：报告`。只在阶段 6 输出，永不动手。

**把完整清单呈现给用户，两组都要给。** 即使【自动】组马上就要动手，也必须先让用户知道要动什么。

退出条件：用户已看到完整清单。

## 阶段 4：执行【自动】组

只处理【自动】组。

**每一块的改动不得超出它 `Remediation` 中声明的 `作用域`。** 越界即为违规，停下来报告。

**每类违规一个 commit。** commit message 首行写清动作，正文写明依据的规则块 id。这样任何一类改错都能单独 `git revert`，不牵连其它。

若某块的 `Remediation` 动作中写了中止条件——例如 `legacy/doc-fork` 的「遇到矛盾指令则中止本块，转入报告」——遇到该条件时立即中止该块，把它移入【报告】组，不要自行选一个方向。

退出条件：【自动】组全部执行完毕，且记录了完整的改动文件清单。**该清单是阶段 5 的唯一扫描范围。**

## 阶段 5：自检

三道门。任一不过即不许交付。全部检查只针对阶段 4 记录的改动文件清单。

1. **路径存在门。** 改动后的文档中，每一条肯定句所断言的位置路径，必须 `test -e` 通过。

   这道门在重构场景比在生成场景更重要——拆分膨胀文档、重写索引时最容易制造死链。

   只校验肯定句。禁令中的路径按定义就不该存在。

2. **占位符门。** 在改动文件清单上搜索 `{{`、`TBD`、`<填写`、`<!-- SLOT:`，以及大写的 T-O-D-O。零残留。

   **绝不扫描框架根目录下的 `reference/`、`INIT.md` 与本文件。** 这些文件按定义含被禁词字面量，扫描它们必然自匹配。这不是理论风险：本框架的设计文档第一次自检时，`grep` 命中的正是「占位符门」这条规则自己的定义行。

3. **溯源门。** 每一处改动必须能指回某个规则块的 `Remediation` 动作。凭空的「顺手优化」一律回滚。

   `AGENTS.md` 写着「不要改无关文件，不要顺手重构 —— 因为它们会淹没本次改动的真实意图」。这道门是它的执行机制。

再运行 `node scripts/check-docs.mjs <目标项目根目录>`，须返回 0。

互斥门与样例污染门不适用：重构不选互斥对，也不从 `reference/example-AGENTS.md` 取材。

退出条件：三道门全过，且 `check-docs.mjs` 返回 0。

## 阶段 6：报告与沉淀

向用户输出：

1. 阶段 2 的完整偏离清单，含被 `Do Not Apply When` 排除的项及其排除依据。
2. 阶段 4 的改动文件清单与 commit 列表。
3. 【报告】组，每条附规则块 id 与证据位置。**原样交出，不代为决策。**
4. 阶段 5 三道门的检查结果。
5. 告知用户：不打算处理的【报告】组条目可写入 `.agents/refactor-ignore.txt`，下次扫描将跳过。

若某类腐烂在多个项目反复出现，走 `meta/rule-sedimentation` 的回流三判定。三条全「是」则抽象成新的 `legacy/` 规则块，补齐字段，写入框架 **git 工作副本**的 `reference/rules/legacy/`，并在回复中明确告知已回流的规则块 id。

不要把回流写进 `~/.claude/plugins/cache/` —— 因为该目录在 `/plugin update` 时被整个替换，写进去的规则会无声消失。

回流后必须运行 `node scripts/validate-rules.mjs`，返回 0 方可提交。
```

- [ ] **Step 2: 验证手册不会触发自身的占位符门**

```bash
grep -n 'TBD\|{{\|<!-- SLOT:' REFACTOR.md
```

期望：**有命中，且命中的全部是阶段 5 第 2 条里被禁词的定义行。**

这不是失败，是预期。它恰恰证明了 Task 3 Step 4 那条排除列表改动的必要性——手册要定义禁什么，就必然含被禁词字面量。确认 `AGENTS.md` 里的排除列表已包含 `REFACTOR.md`：

```bash
grep -n 'REFACTOR.md' AGENTS.md
```

期望：命中占位符检查那一条。若无命中，回到 Task 3 Step 4。

- [ ] **Step 3: 跑文档健康检查**

```bash
node scripts/check-docs.mjs
```

期望：退出码 0。

- [ ] **Step 4: 提交**

```bash
git add REFACTOR.md
git commit -m "REFACTOR.md：重构模式六阶段手册

与 INIT.md 平级，不侵入生成流程。阶段 0 两个硬闸门（AGENTS.md 存在、
工作区干净）；阶段 1 扫描集 = 选入的规则 ∪ 全部 legacy 块；阶段 2 只读；
阶段 4 每类违规一个 commit；阶段 5 复用 INIT 五道门中的三道。"
```

---

## Task 5: skill 入口、抑制文件模板与插件清单

**Files:**
- Create: `skills/refactor-legacy/SKILL.md`
- Create: `templates/agents-dir/refactor-ignore.txt`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: Task 4 的 `REFACTOR.md`。
- Produces: 用户可见的 skill 入口 `refactor-legacy`。

**注意：两个 plugin.json 都不逐个注册 skill。** `.codex-plugin/plugin.json` 用 `"skills": "./skills/"` 自动发现整个目录，`.claude-plugin/plugin.json` 根本没有 skills 字段（Claude Code 自动扫描 `skills/`）。所以本任务对 plugin.json 的改动只是**更新描述与 defaultPrompt**，不是注册。

- [ ] **Step 1: 写 skills/refactor-legacy/SKILL.md**

对齐 `skills/init-agents/SKILL.md` 的写法——只做转发，不重复手册内容：

```markdown
---
name: refactor-legacy
description: 扫描已有项目的存量文档与结构腐烂，自动整理可逆的文档问题，报告不可逆的代码问题。当用户要求「整理这个老项目」「扫描存量违规」「清理烂摊子文档」「检查 AGENTS.md 与 CLAUDE.md 是否分叉」时使用。需要目标项目已有 AGENTS.md。
---

读取并逐步执行 `${CLAUDE_PLUGIN_ROOT}/REFACTOR.md`。

该文件是唯一事实源，本 skill 不重复其内容。不要凭记忆执行流程 —— 因为手册会更新，而记忆不会。

`REFACTOR.md` 中出现的 `reference/`、`scripts/` 均相对于 `${CLAUDE_PLUGIN_ROOT}`。被扫描与被整理的是目标项目。

执行前先确认目标项目根目录。若用户未指定，默认为当前工作目录。

本 skill 要求目标项目已有 `AGENTS.md`。没有则先运行 `init-agents`。
```

- [ ] **Step 2: 写 templates/agents-dir/refactor-ignore.txt**

```
# refactor-ignore
#
# 本文件列出你已确认不打算处理的存量违规。REFACTOR.md 阶段 2 扫描时跳过它们。
#
# 一行一条，格式：<规则块 id> <空格> <命中位置>
# 以 # 开头的行是注释。空行忽略。
#
# 例：
# legacy/orphan-abstraction database/repositories/
# frontend/anti-over-abstraction src/components/Wrapper.tsx
#
# 只写你真的决定不改的。这个文件的价值在于它记录的是「决策」，
# 不是「待办」—— 待办不写在这里，写在 docs/progress/todo.md。
```

- [ ] **Step 3: 更新 .claude-plugin/plugin.json 的描述**

把 `description` 字段从：

```
"description": "规则素材库与生成器。扫描项目真实技术栈，按条件组装出一份不含虚假信息的 AGENTS.md。26 个带适用条件的规则块，五道自检门，默认排除。",
```

改为：

```
"description": "规则素材库与生成器。扫描项目真实技术栈，按条件组装出一份不含虚假信息的 AGENTS.md；再扫描存量文档与结构腐烂，自动整理可逆的，报告不可逆的。31 个带适用条件的规则块，默认排除。",
```

并在 `keywords` 数组末尾追加 `"refactoring"`：

```json
  "keywords": [
    "agents-md",
    "constraints",
    "code-generation",
    "rules",
    "governance",
    "refactoring"
  ]
```

- [ ] **Step 4: 更新 .codex-plugin/plugin.json**

三处改动。

`description`：

```
"description": "Scan a project's real tech stack and assemble a project-specific AGENTS.md from 31 conditioned rule blocks; then scan legacy docs and structure for rot, auto-fixing the reversible and reporting the rest.",
```

`interface.longDescription`：

```
"longDescription": "一个规则素材库与生成器。它先扫描目标项目的依赖清单与目录结构，逐块判定 31 个带适用条件的规则块，只写入有文件系统证据支撑的规则，再通过溯源、路径存在、样例污染、占位符、互斥五道门。重构模式则反向扫描存量腐烂：自动整理文档层面可逆的问题，代码层面的问题只报告不动手。默认排除：没有证据就不写。",
```

`interface.defaultPrompt`——追加两条，保留原有三条：

```json
    "defaultPrompt": [
      "为当前项目初始化 agent 框架",
      "扫描这个项目并生成 AGENTS.md",
      "检查这个项目的 AGENTS.md 与 CLAUDE.md 是否已经分叉",
      "扫描这个老项目的存量文档与结构腐烂",
      "整理这个项目的烂摊子文档"
    ]
```

- [ ] **Step 5: 验证两个 JSON 仍是合法 JSON**

```bash
node -e "JSON.parse(require('node:fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('node:fs').readFileSync('.codex-plugin/plugin.json','utf8')); console.log('两个 plugin.json 均为合法 JSON')"
```

期望：打印成功消息，退出码 0。手改 JSON 最常见的失败是漏逗号或多逗号，这一步专门挡它。

- [ ] **Step 6: 跑全部检查**

```bash
node scripts/validate-rules.mjs && node scripts/check-docs.mjs && npm test
```

期望：三者全绿。

- [ ] **Step 7: 提交**

```bash
git add skills/refactor-legacy templates/agents-dir/refactor-ignore.txt .claude-plugin/plugin.json .codex-plugin/plugin.json
git commit -m "refactor-legacy skill 入口与抑制文件模板

skill 只做转发，手册是唯一事实源。plugin.json 两处只更新描述与
defaultPrompt —— skill 由目录自动发现，无需逐个注册。

refactor-ignore.txt 记录的是「决定不改」这个用户决策，不是待办。"
```

---

## Task 6: README 与证据链

**Files:**
- Modify: `README.md`
- Modify: `docs/evidence.md`

**Interfaces:**
- Consumes: Task 2 的 5 个块及其 `anti-patterns.md` 来源。
- Produces: 无代码接口。

- [ ] **Step 1: 在 README.md 的「五道自检门」一节后插入「重构模式」一节**

```markdown
## 重构模式

生成器立宪法，重构模式清算历史。两件事，两个 skill：

```
/agent-framework:init-agents      先立宪法，生成 AGENTS.md
/agent-framework:refactor-legacy  再清算历史，扫描存量腐烂
```

有序。`refactor-legacy` 要求 `AGENTS.md` 已存在——它得知道哪些规则被选入了，否则只能全量扫描，而全量扫描会在一个 Go 项目里报出 Python 的规则违规。那是噪音，不是发现。

### 增量语义与存量语义

规则块的 `Verification` 是**增量**的：`应无新增命中`。它只守住新代码不恶化，不管老代码。这不是疏忽——老项目一上来报 500 处违规，AI 会摆烂或乱改一通。

重构模式给规则块加了第二个可选字段 `Legacy Scan`，它是**存量**的：`应无命中`。同一条 grep，去掉「新增」二字。

### 两个可逆性档位

扫到之后做什么，由 `Remediation` 的 `可逆性` 决定：

| 档位 | 做什么 | 例子 |
| --- | --- | --- |
| `自动` | AI 直接动手，**只许写文档** | 合并分叉的 `CLAUDE.md`、把踩坑记录迁出膨胀的约束文件、补 `docs/index.md` |
| `报告` | 只列清单，不动文件 | 疑似废弃的空目录、约束文件里的第三方库知识、代码分层违规 |

**代码永远只报告，不动手。**这是设计上限，由 `validate-rules.mjs` 强制：标为 `自动` 的块必须声明写作用域，且每项须落在文档白名单内。

### 腐烂探针从哪来

`reference/anti-patterns.md` 里那 8 条反模式，本来只被 `INIT.md` 用来自检「别把生成结果写成这样」。重构模式把其中 4 条**在目标项目文件系统上留下可扫描痕迹**的升格成了 `legacy/` 规则块，去扫别人。

升格后它们免费获得了五字段格式的 `Do Not Apply When`——而这在重构场景里是**防误杀机制**：

```markdown
## Do Not Apply When
- 该目录在 .gitignore 中，或是构建产物目录。
- 该目录是包的命名空间占位，父包的 __init__.py 中有对它的 import。
- 该目录在最近 90 天内有 git 提交 —— 说明它在建设中，不是被放弃的。
```

空目录和「刚被清空、正在重建」的活目录在文件系统上完全同形。上面第三条 `git log -1` 把它们分开了。这就是为什么 `legacy/` 块被强制要求至少两条排除条件——**误杀的代价（删掉活代码）远大于漏报的代价（没清理干净）**。

### 重复运行的噪音

【报告】组的违规不会自动消失，第二次跑会把同样几百条再报一遍。把你确认不改的条目写进 `.agents/refactor-ignore.txt`，扫描时跳过。

它记录的是**决策**，不是待办。待办写 `docs/progress/todo.md`。
```

- [ ] **Step 2: 更新 README.md 中所有「26 个规则块」的表述**

```bash
grep -n '26' README.md
```

逐处改为 31。至少这三处：

- 开头「所以这里是 26 个带**适用条件**的规则块」
- `## 结构` 表格中的 `reference/rules/` 行：「26 个规则块」
- 任何其它出现 26 的地方

`## 校验` 一节的「22 个单元测试」也要改成 26（Task 1 加了 4 个）。

- [ ] **Step 3: 在 docs/evidence.md 追加 legacy/ 块的证据来源**

```markdown
## legacy/ 规则块的证据来源

这 5 个块不来自对外部项目的调研，来自 `reference/anti-patterns.md`——那份档案本身就是对真实项目状态的记录。升格只是把它们从「生成器的自检清单」变成「目标项目的探针」。

| 规则块 | 来源 | 原始证据 |
| --- | --- | --- |
| `legacy/doc-fork` | anti-patterns 第 1 条 | 某爬虫项目 `AGENTS.md` 33KB 停在旧架构、`CLAUDE.md` 27KB 是新版；某财务项目两份文件在同一行号给出正面矛盾的指令 |
| `legacy/memory-bloat` | anti-patterns 第 2 条 | 某项目 `CLAUDE.md` 十天内从 10KB 增至 146KB，51 条踩坑记录漂移成三种格式 |
| `legacy/orphan-abstraction` | anti-patterns 第 3 条 | 某项目遗留空的 `database/repositories/`，是引入抽象层后放弃的直接证据 |
| `legacy/vendored-knowledge` | anti-patterns 第 6 条 | 某浏览器自动化库的选择器陷阱与反爬指纹配方，在两个项目的 `CLAUDE.md` 中代码几乎逐字相同 |
| `legacy/doc-index-rot` | 无 anti-patterns 来源 | `docs/ai-doc-index` 规则块与 `check-docs.mjs` 的死链检测已存在，本块只是把现成能力接进重构扫描 |

anti-patterns 第 4 条（规则脱离适用边界）已由互斥对机制处理，不需要探针。

第 5、7、8 条（检查脚本自匹配、静默通过的检查、夹具驱动测试）约束的是**框架自身的开发行为**，在目标项目的文件系统上不留下可扫描痕迹，因此不升格。它们留在 `anti-patterns.md`。
```

- [ ] **Step 4: 跑文档健康检查**

```bash
node scripts/check-docs.mjs
```

期望：退出码 0。README 新增的内部链接若有死链，这一步会抓到。

- [ ] **Step 5: 提交**

```bash
git add README.md docs/evidence.md
git commit -m "README 与证据链：重构模式

README 补重构模式一节，说明增量语义与存量语义之分、两个可逆性档位、
腐烂探针的来源。规则块数 26 改 31，测试数 22 改 26。

evidence.md 记录 5 个 legacy 块各自对应 anti-patterns 的哪一条，
以及为什么第 5、7、8 条不升格。"
```

---

## Task 7: 在真实老项目副本上验收

这是唯一能证明前六个任务有价值的任务。夹具反映作者的想象力，真实项目反映世界。

`check-docs.mjs` 有 8 个单元测试全绿，一碰到 fumadocs 真实项目就报 19 个假死链——那个形态在写夹具时根本没被想到。

**Files:** 无。本任务不向被验收的仓库写入任何文件。

**Interfaces:**
- Consumes: Task 1-6 的全部产物。
- Produces: 一份验收结论。若不通过，产出的是对 Task 2 中可逆性分级的修正。

- [ ] **Step 1: 准备一个真实老项目的副本**

选一个满足以下条件的项目：**同时有 `AGENTS.md` 与 `CLAUDE.md`、`docs/` 下有超过 3 篇文档、有一定历史（不是本框架刚生成的）。**

复制到临时目录，不要在原仓库上跑：

```bash
cp -r /path/to/real-project /tmp/refactor-acceptance
cd /tmp/refactor-acceptance
git status --short
```

期望：`git status --short` 为空。若不为空，先 `git stash`——阶段 0 的第二个闸门会挡住脏工作区，这是设计如此。

- [ ] **Step 2: 跑完整的六阶段**

在副本目录里，让 AI 执行框架根目录的 `REFACTOR.md`，逐阶段走完。

- [ ] **Step 3: 检查阶段 1 的扫描集是不是噪音**

看阶段 1 产出的扫描集清单。**每一块的选入依据都必须指向副本中真实存在的文件或目录。**

若出现「这个项目根本不用 React，为什么扫了前端规则」这类条目，说明阶段 1 的反查逻辑写错了——它没有真正比对 `AGENTS.md`，而是把 `reference/rules/` 全塞进来了。回到 Task 4 修 `REFACTOR.md` 阶段 1。

- [ ] **Step 4: 检查 Do Not Apply When 有没有真的被跑**

看阶段 2 偏离清单的「排除判定」列。**至少要有一条命中被 `Do Not Apply When` 排除掉。**

若一条排除都没有，有两种可能：这个项目确实干净（少见），或者 AI 跳过了排除判定直接报了所有命中（常见）。**用一个已知的假阳性去验证**——比如在副本里手动 `mkdir -p src/adapters` 造一个空目录，然后 `git add` 提交它，再重跑阶段 2。`legacy/orphan-abstraction` 应该因为「最近 90 天内有提交」而排除它。

排除不掉就是防误杀机制失效，这是**阻断性缺陷**，回到 Task 2 修 `legacy/orphan-abstraction` 的排除条件。

- [ ] **Step 5: 读【自动】组改完的文档**

这是本任务真正要回答的问题。不是「扫描器跑通了吗」，而是：

> **【自动】组动手改完的文档，你读一遍，愿意 commit 吗？**

逐个看 `git diff HEAD~N`（N 是阶段 4 产生的 commit 数）。

若答案是「改是改了，但我还得再收拾一遍」——比如合并 `CLAUDE.md` 时把条目顺序打乱了、迁移踩坑记录时改写了措辞——**说明可逆性分级划错了**，把那类动作从 `自动` 降级到 `报告`，回到 Task 2 改对应块的 `Remediation`。

降级不是失败。**代码永远只报告**这个上限，正是从同一个判断推出来的：不确定能不能改好，就不要改。

- [ ] **Step 6: 验证阶段 5 的三道门真的跑了**

```bash
node scripts/check-docs.mjs /tmp/refactor-acceptance
```

期望：退出码 0。

特别看路径存在门：**改动后的文档里，每个链接都还活着吗？**拆分膨胀文档、重写 `docs/index.md` 时最容易制造死链。

- [ ] **Step 7: 确认没有向原仓库写入任何东西**

```bash
cd /path/to/real-project && git status --short
```

期望：空。`AGENTS.md` 写着「验收在真实项目的副本上进行。不要向被验收的仓库写入文件 —— 因为验收不得成为一次未经请求的改动」。

- [ ] **Step 8: 记录验收结论**

把验收结果追加到 `docs/pitfalls.md`——**尤其是那些在夹具里想不到、只有真实项目才暴露的形态**。这些正是下一次改进的输入。

若 Step 5 导致了任何降级，在 `docs/evidence.md` 的 legacy 表格中记下降级的理由。

```bash
git add docs/pitfalls.md docs/evidence.md
git commit -m "验收：在真实老项目副本上跑通重构模式六阶段

记录夹具未能预见的形态。"
```

---

## Self-Review

**Spec coverage：**

| Spec 章节 | 实现任务 |
| --- | --- |
| 规则块：五必需 + 两可选 | Task 1（校验器）、Task 3（格式规范） |
| 写作用域白名单 | Task 1 Step 4 的 `DOC_SCOPE` |
| 新增 category `legacy/` | Task 2 |
| 5 个腐烂探针 | Task 2 Step 1-5 |
| 扫描集公式 | Task 4 阶段 1 |
| `REFACTOR.md` 六阶段 | Task 4 |
| 抑制文件 | Task 4 阶段 2/6、Task 5 Step 2 |
| 四条校验断言 | Task 1 Step 4 |
| 4 个已知违规夹具 | Task 1 Step 1-2 |
| 真实项目验收 | Task 7 |
| 改动清单全部 12 项 | Task 1-6 |
| 「不做什么」三条 | 无任务实现，这是排除项：不做棘轮基线、不自动改代码（Task 1 断言 3 强制）、不落盘 backlog |

**Type consistency：** `validateRemediation(block)` 在 Task 1 定义，被 `runValidation` 调用，签名与 `validateBlock` / `validatePartition` 一致（接收 block 或 blocks，返回 `string[]`）。`block.sections['Legacy Scan']` 与 `block.sections.Remediation` 的键名与 Task 2 的 5 个规则块中的 `## ` 标题逐字对应。可逆性取值 `自动` / `报告` 在 Task 1、2、3、4、6 中全部一致。

**已知风险：** Task 4 阶段 1 的「反查哪些规则块被选入」依赖 AI 比对 `Rule` 正文与 `AGENTS.md` 内容，这是本计划中唯一不可完全机械判定的一步。Task 7 Step 3 专门验它。若真实项目上失败，退路是要求 `INIT.md` 在生成时把选入的规则块 id 写进 `AGENTS.md` 尾部的注释——但那会改动 `INIT.md`，超出本计划范围，作为后续改进。
