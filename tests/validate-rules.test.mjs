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
