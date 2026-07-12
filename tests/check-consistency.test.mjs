import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  checkCounts,
  checkLegacyTiers,
  checkRuleIdRefs,
  checkPlaceholders,
  checkPrunePatterns,
  checkExampleBlocks,
  runChecks
} from '../scripts/check-consistency.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')

// ---------- checkCounts ----------

test('声明的规则块数与实际不符被拒绝', () => {
  const errors = checkCounts({ 'README.md': '这里是 26 个带**适用条件**的规则块。' }, { total: 31 })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /README\.md/)
  assert.match(errors[0], /26/)
  assert.match(errors[0], /31/)
})

test('声明的规则块数与实际一致时通过', () => {
  assert.deepEqual(checkCounts({ 'README.md': '这里是 31 个带**适用条件**的规则块。' }, { total: 31 }), [])
})

test('英文的 conditioned rule blocks 同样被检查', () => {
  const errors = checkCounts({ 'plugin.json': 'assemble from 26 conditioned rule blocks' }, { total: 31 })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /26/)
})

test('带消歧后缀的数字不被误判', () => {
  // 「26 个原有 + 5 个 legacy/ 存量扫描块」不是在声明总数
  const text = '31 个规则块（26 个原有 + 5 个 `legacy/` 存量扫描块）'
  assert.deepEqual(checkCounts({ 'README.md': text }, { total: 31 }), [])
})

// ---------- checkLegacyTiers ----------

test('README 的档位表与规则块的实际可逆性不符被拒绝', () => {
  const blocks = { 'doc-fork': '报告', 'doc-index-rot': '自动' }
  const readme = '| `doc-fork` | `自动` | 否 |\n| `doc-index-rot` | `自动` | 否 |'
  const errors = checkLegacyTiers(readme, blocks)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /doc-fork/)
  assert.match(errors[0], /README 说「自动」/)
  assert.match(errors[0], /规则块是「报告」/)
})

test('档位表一致时通过', () => {
  const blocks = { 'doc-fork': '报告', 'doc-index-rot': '自动' }
  const readme = '| `doc-fork` | `报告` | 是 |\n| `doc-index-rot` | `自动` | 否 |'
  assert.deepEqual(checkLegacyTiers(readme, blocks), [])
})

// ---------- checkRuleIdRefs ----------

test('引用不存在的规则块 id 被拒绝', () => {
  const errors = checkRuleIdRefs({ 'REFACTOR.md': '见 `legacy/does-not-exist` 的定义。' }, new Set(['legacy/doc-fork']))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/does-not-exist/)
  assert.match(errors[0], /REFACTOR\.md/)
})

test('引用存在的规则块 id 时通过', () => {
  assert.deepEqual(
    checkRuleIdRefs({ 'REFACTOR.md': '见 `legacy/doc-fork`。' }, new Set(['legacy/doc-fork'])),
    []
  )
})

// ---------- checkPlaceholders ----------

test('未替换的 <owner> 占位符被拒绝', () => {
  const errors = checkPlaceholders({ 'README.md': '/plugin marketplace add <owner>/agent-framework' })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /<owner>/)
})

test('CLAUDE_PLUGIN_ROOT 作为可执行路径被拒绝', () => {
  const errors = checkPlaceholders({ 'skills/x/SKILL.md': '读取 `${CLAUDE_PLUGIN_ROOT}/INIT.md`。' })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /CLAUDE_PLUGIN_ROOT/)
})

test('CLAUDE_PLUGIN_ROOT 出现在「不要依赖它」的警告里时放行', () => {
  const text = '不要依赖 `${CLAUDE_PLUGIN_ROOT}` 之类的环境变量，Codex 不认识它。'
  assert.deepEqual(checkPlaceholders({ 'skills/x/SKILL.md': text }), [])
})

// ---------- checkPrunePatterns ----------

test('用 ./ 前缀的 prune 模式被拒绝', () => {
  const errors = checkPrunePatterns({ 'INIT.md': 'find . -type d -empty -not -path "./node_modules/*"' })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /INIT\.md/)
  assert.match(errors[0], /只排除顶层/)
})

test('用 */ 前缀的 prune 模式通过', () => {
  assert.deepEqual(
    checkPrunePatterns({ 'INIT.md': 'find . -type d -empty -not -path "*/node_modules/*"' }),
    []
  )
})

// ---------- 真实仓库 ----------

test('本仓库自身通过全部一致性检查', () => {
  assert.deepEqual(runChecks(repoRoot), [])
})

// ---------- checkExampleBlocks ----------

test('README 里的规则块示例与真实文件不符被拒绝', () => {
  const readme = [
    '```markdown',
    '---',
    'id: frontend/x',
    'category: frontend',
    'exclusive-with: null',
    '---',
    '',
    '## Applies When',
    '- 我编的条件。',
    '```'
  ].join('\n')
  const real = { 'frontend/x': '---\nid: frontend/x\ncategory: frontend\nexclusive-with: null\n---\n\n## Applies When\n- 真实的条件。\n' }
  const errors = checkExampleBlocks(readme, real)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /frontend\/x/)
  assert.match(errors[0], /与真实文件不符/)
})

test('README 里的规则块示例与真实文件一致时通过', () => {
  const body = '---\nid: frontend/x\ncategory: frontend\nexclusive-with: null\n---\n\n## Applies When\n- 真实的条件。'
  const readme = '```markdown\n' + body + '\n```'
  assert.deepEqual(checkExampleBlocks(readme, { 'frontend/x': body + '\n' }), [])
})
