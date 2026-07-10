import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sha256, rawUrl, checkSkill, checkAll } from '../scripts/sync-skills.mjs'

const SKILL_TEXT = '# frontend-design\n\n内容。\n'
const SKILL_HASH = sha256(SKILL_TEXT)

const fakeFetch = (body, ok = true) => async () => ({
  ok,
  status: ok ? 200 : 404,
  text: async () => body
})

test('sha256 是稳定的十六进制摘要', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('rawUrl 拼出 raw.githubusercontent.com 地址', () => {
  assert.equal(
    rawUrl('anthropics/skills', 'skills/frontend-design/SKILL.md'),
    'https://raw.githubusercontent.com/anthropics/skills/HEAD/skills/frontend-design/SKILL.md'
  )
})

test('hash 匹配时状态为 ok', async () => {
  const entry = { source: 'anthropics/skills', sourceType: 'github', skillPath: 'skills/frontend-design/SKILL.md', computedHash: SKILL_HASH }
  const r = await checkSkill('frontend-design', entry, { fetchImpl: fakeFetch(SKILL_TEXT) })
  assert.equal(r.status, 'ok')
})

test('lock 被篡改时状态为 drift', async () => {
  const entry = { source: 'anthropics/skills', sourceType: 'github', skillPath: 'skills/frontend-design/SKILL.md', computedHash: 'deadbeef' }
  const r = await checkSkill('frontend-design', entry, { fetchImpl: fakeFetch(SKILL_TEXT) })
  assert.equal(r.status, 'drift')
  assert.equal(r.expected, 'deadbeef')
  assert.equal(r.actual, SKILL_HASH)
})

test('远端 404 时状态为 error', async () => {
  const entry = { source: 'x/y', sourceType: 'github', skillPath: 'a/SKILL.md', computedHash: 'x' }
  const r = await checkSkill('x', entry, { fetchImpl: fakeFetch('Not Found', false) })
  assert.equal(r.status, 'error')
})

test('checkAll 汇总每个条目', async () => {
  const lock = {
    version: 1,
    skills: {
      a: { source: 's/a', sourceType: 'github', skillPath: 'a/SKILL.md', computedHash: SKILL_HASH },
      b: { source: 's/b', sourceType: 'github', skillPath: 'b/SKILL.md', computedHash: 'wrong' }
    }
  }
  const results = await checkAll(lock, { fetchImpl: fakeFetch(SKILL_TEXT) })
  assert.equal(results.length, 2)
  assert.equal(results.find((r) => r.name === 'a').status, 'ok')
  assert.equal(results.find((r) => r.name === 'b').status, 'drift')
})
