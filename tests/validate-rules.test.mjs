import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { runValidation, parseRuleBlock } from '../scripts/validate-rules.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => path.join(here, 'fixtures', name)

test('合法素材库通过校验', () => {
  assert.deepEqual(runValidation(fixture('valid')), [])
})

test('缺 Verification 被拒绝', () => {
  const errors = runValidation(fixture('invalid-missing-verification'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /core\/bad\.md/)
  assert.match(errors[0], /Verification/)
})

test('三元组重复被拒绝', () => {
  const errors = runValidation(fixture('invalid-duplicate-triple'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /三元组重复/)
  assert.match(errors[0], /core\/one/)
  assert.match(errors[0], /core\/two/)
})

test('单向 exclusive-with 被拒绝', () => {
  const errors = runValidation(fixture('invalid-one-way-exclusive'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /core\/left/)
  assert.match(errors[0], /未反向引用/)
})

test('无因为的禁令被拒绝', () => {
  const errors = runValidation(fixture('invalid-bare-prohibition'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /core\/bare\.md/)
  assert.match(errors[0], /因为/)
})

test('parseRuleBlock 提取 frontmatter 与五个字段', () => {
  const text = [
    '---',
    'id: core/x',
    'category: core',
    'exclusive-with: null',
    '---',
    '',
    '## Applies When',
    '- 甲',
    '',
    '## Do Not Apply When',
    '- 无',
    '',
    '## Output Target',
    'PREAMBLE',
    '',
    '## Rule',
    '- 正面规则',
    '',
    '## Verification',
    '- 自查',
    ''
  ].join('\n')
  const block = parseRuleBlock(text, 'core/x.md')
  assert.equal(block.id, 'core/x')
  assert.equal(block.category, 'core')
  assert.equal(block.exclusiveWith, null)
  assert.deepEqual(block.sections['Output Target'], ['PREAMBLE'])
})

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

test('空的 Legacy Scan 标题被拒绝', () => {
  const errors = runValidation(fixture('invalid-empty-legacy-scan'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/e\.md/)
  assert.match(errors[0], /Legacy Scan/)
})

test('自动档缺失作用域被拒绝', () => {
  const errors = runValidation(fixture('invalid-auto-scope-missing'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/f\.md/)
  assert.match(errors[0], /作用域/)
})

test('报告档声明作用域被拒绝', () => {
  const errors = runValidation(fixture('invalid-report-declares-scope'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/g\.md/)
  assert.match(errors[0], /作用域/)
})

test('自动档作用域逃出仓库被拒绝', () => {
  const errors = runValidation(fixture('invalid-auto-scope-escape-repo'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/h\.md/)
  assert.match(errors[0], /作用域/)
})

test('自动档作用域为 docs/ 下非文档被拒绝', () => {
  const errors = runValidation(fixture('invalid-auto-scope-nondoc'))
  assert.equal(errors.length, 1)
  assert.match(errors[0], /legacy\/i\.md/)
  assert.match(errors[0], /作用域/)
})
