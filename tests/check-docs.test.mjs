import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkTransclusion, checkLineBudget, checkDeadLinks, runChecks } from '../scripts/check-docs.mjs'

function tmpProject (files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chkdocs-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
  return dir
}

test('单行 transclusion 通过', () => {
  assert.deepEqual(checkTransclusion('@AGENTS.md\n'), [])
})

test('含技术细节的 CLAUDE.md 被拒绝', () => {
  const errors = checkTransclusion('# CLAUDE.md\n\n本项目用 FastAPI。\n')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /CLAUDE\.md/)
})

test('空行不计入 transclusion 行数', () => {
  assert.deepEqual(checkTransclusion('\n@AGENTS.md\n\n'), [])
})

test('超出行数预算被拒绝', () => {
  const long = Array.from({ length: 301 }, (_, i) => `第 ${i} 行`).join('\n')
  const errors = checkLineBudget(long, 300)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /301/)
})

test('死链被检出', () => {
  const dir = tmpProject({ 'AGENTS.md': '见 [规范](docs/nope.md)。\n' })
  const errors = checkDeadLinks('见 [规范](docs/nope.md)。\n', dir, 'AGENTS.md')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /docs\/nope\.md/)
})

test('外链与锚点不被当作死链', () => {
  const dir = tmpProject({ 'AGENTS.md': 'x\n' })
  const content = '[a](https://example.com) [b](#anchor) [c](mailto:x@y.z)\n'
  assert.deepEqual(checkDeadLinks(content, dir, 'AGENTS.md'), [])
})

test('文档站的绝对路由不被当作死链', () => {
  // fumadocs / VitePress / Docusaurus 的索引里写的是站点路由，不是文件路径。
  // 例如某 fumadocs 项目的 docs/index.md 全是 /docs/overview/quick-start 这种形式。
  const dir = tmpProject({ 'docs/index.md': 'x\n' })
  const content = '- [快速开始](/docs/overview/quick-start)\n- [功能介绍](/docs/overview/features)\n'
  assert.deepEqual(checkDeadLinks(content, dir, 'docs/index.md'), [])
})

test('相对路径的死链仍然被检出', () => {
  const dir = tmpProject({ 'docs/index.md': 'x\n' })
  const content = '- [踩坑](pitfalls.md)\n'
  const errors = checkDeadLinks(content, dir, 'docs/index.md')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /pitfalls\.md/)
})

test('健康项目整体通过', () => {
  const dir = tmpProject({
    'AGENTS.md': '# AGENTS.md\n\n见 [踩坑](docs/pitfalls.md)。\n',
    'CLAUDE.md': '@AGENTS.md\n',
    'docs/pitfalls.md': '# 踩坑记录\n'
  })
  assert.deepEqual(runChecks(dir), [])
})

test('缺少 CLAUDE.md 被检出', () => {
  const dir = tmpProject({ 'AGENTS.md': '# AGENTS.md\n' })
  const errors = runChecks(dir)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /CLAUDE\.md 不存在/)
})
