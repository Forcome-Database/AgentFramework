#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LINE_BUDGET = 300
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g

export function checkTransclusion (content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length !== 1) {
    return [`CLAUDE.md 应恰为一行 transclusion，实际有 ${lines.length} 行非空内容。禁止在其中写技术细节。`]
  }
  if (lines[0].trim() !== '@AGENTS.md') {
    return [`CLAUDE.md 唯一一行应为 @AGENTS.md，实际为：${lines[0].trim()}`]
  }
  return []
}

export function checkLineBudget (content, max = LINE_BUDGET) {
  const n = content.split(/\r?\n/).length
  if (n > max) {
    return [`AGENTS.md 有 ${n} 行，超出 ${max} 行预算。停止追加，先按主题拆分到 docs/ 下。`]
  }
  return []
}

export function checkDeadLinks (content, root, sourceFile) {
  const errors = []
  for (const match of content.matchAll(LINK_RE)) {
    const target = match[1].trim()
    if (/^(https?:|mailto:|#)/.test(target)) continue
    // 以 / 开头的是文档站的站点路由（fumadocs、VitePress、Docusaurus 都这么写），
    // 不是文件系统路径。解析它需要知道站点的路由规则，本脚本不做这件事。
    // 证据：某 fumadocs 项目的 docs/index.md 全部是 /docs/overview/quick-start 这种形式。
    if (target.startsWith('/')) continue
    const clean = target.split('#')[0]
    if (clean === '') continue
    const abs = path.resolve(root, clean)
    if (!fs.existsSync(abs)) {
      errors.push(`${sourceFile}: 死链 ${target}`)
    }
  }
  return errors
}

// docs/ 下的每一篇 .md（index.md 自己除外）都必须能从 docs/index.md 一跳到达。
export function checkIndexCoverage (root) {
  const docsDir = path.join(root, 'docs')
  if (!fs.existsSync(docsDir)) return []
  const indexPath = path.join(docsDir, 'index.md')
  if (!fs.existsSync(indexPath)) return ['docs/index.md 不存在']

  const index = fs.readFileSync(indexPath, 'utf8')
  const linked = new Set()
  for (const m of index.matchAll(LINK_RE)) {
    const t = m[1].trim().split('#')[0]
    if (!t || /^(https?:|mailto:)/.test(t) || t.startsWith('/')) continue
    linked.add(path.resolve(docsDir, t))
  }

  const errors = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name)
      if (e.isDirectory()) { walk(abs); continue }
      if (!e.name.endsWith('.md')) continue
      if (abs === indexPath) continue
      if (!linked.has(abs)) {
        errors.push(`docs/index.md 未收录 ${path.relative(root, abs).split(path.sep).join('/')}`)
      }
    }
  }
  walk(docsDir)
  return errors
}

// 四个分项。一个规则块只该跑它作用域内的那一项 ——
// 因为 check-docs.mjs 断言的是**全局**不变量，而一个块只对自己的作用域负责。
// 让它跑全量，别的块的病会让它永远过不了自己的 Verification（见 docs/pitfalls.md 第 11 条）。
const CHECKS = {
  'line-budget': (root) => {
    const p = path.join(root, 'AGENTS.md')
    return fs.existsSync(p) ? checkLineBudget(fs.readFileSync(p, 'utf8')) : ['AGENTS.md 不存在']
  },
  transclusion: (root) => {
    const p = path.join(root, 'CLAUDE.md')
    return fs.existsSync(p) ? checkTransclusion(fs.readFileSync(p, 'utf8')) : ['CLAUDE.md 不存在。它应为单行 @AGENTS.md。']
  },
  'dead-links': (root) => {
    const errors = []
    const a = path.join(root, 'AGENTS.md')
    if (fs.existsSync(a)) errors.push(...checkDeadLinks(fs.readFileSync(a, 'utf8'), root, 'AGENTS.md'))
    const i = path.join(root, 'docs', 'index.md')
    if (fs.existsSync(i)) errors.push(...checkDeadLinks(fs.readFileSync(i, 'utf8'), path.join(root, 'docs'), 'docs/index.md'))
    return errors
  },
  // legacy/doc-index-rot 与 docs/ai-doc-index 的作用域：索引的完整性与死链。
  // 不含 CLAUDE.md transclusion、不含 AGENTS.md 行数预算 —— 那些不归它们管。
  'doc-index': (root) => {
    const errors = [...checkIndexCoverage(root)]
    const i = path.join(root, 'docs', 'index.md')
    if (fs.existsSync(i)) errors.push(...checkDeadLinks(fs.readFileSync(i, 'utf8'), path.join(root, 'docs'), 'docs/index.md'))
    return errors
  }
}

export const CHECK_NAMES = Object.keys(CHECKS)

export function runChecks (root, { only } = {}) {
  const names = only ?? ['line-budget', 'transclusion', 'dead-links']
  const errors = []
  for (const n of names) {
    const fn = CHECKS[n]
    if (!fn) throw new Error(`未知的检查项：${n}。可选：${CHECK_NAMES.join(', ')}`)
    errors.push(...fn(root))
  }
  return errors
}

// 见 docs/pitfalls.md 第 1 条：import.meta.url 的 pathname 是 percent-encoded，
// 必须用 fileURLToPath 解码，否则含非 ASCII 字符的路径下 CLI 静默不执行且退出 0。
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  const args = process.argv.slice(2)
  const onlyArg = args.find((a) => a.startsWith('--only='))
  const root = args.find((a) => !a.startsWith('--')) || process.cwd()
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : undefined

  let errors
  try {
    errors = runChecks(root, { only })
  } catch (e) {
    console.error(`✗ ${e.message}`)
    process.exit(2)
  }
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`)
    process.exit(1)
  }
  console.log(only ? `✓ 分项检查通过：${only.join(', ')}` : '✓ 文档健康检查通过')
}
