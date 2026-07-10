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

export function runChecks (root) {
  const errors = []
  const agentsPath = path.join(root, 'AGENTS.md')
  const claudePath = path.join(root, 'CLAUDE.md')

  if (!fs.existsSync(agentsPath)) {
    errors.push('AGENTS.md 不存在')
  } else {
    const agents = fs.readFileSync(agentsPath, 'utf8')
    errors.push(...checkLineBudget(agents))
    errors.push(...checkDeadLinks(agents, root, 'AGENTS.md'))
  }

  if (!fs.existsSync(claudePath)) {
    errors.push('CLAUDE.md 不存在。它应为单行 @AGENTS.md。')
  } else {
    errors.push(...checkTransclusion(fs.readFileSync(claudePath, 'utf8')))
  }

  const indexPath = path.join(root, 'docs', 'index.md')
  if (fs.existsSync(indexPath)) {
    errors.push(...checkDeadLinks(fs.readFileSync(indexPath, 'utf8'), path.join(root, 'docs'), 'docs/index.md'))
  }
  return errors
}

// 见 docs/pitfalls.md 第 1 条：import.meta.url 的 pathname 是 percent-encoded，
// 必须用 fileURLToPath 解码，否则含非 ASCII 字符的路径下 CLI 静默不执行且退出 0。
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  const root = process.argv[2] || process.cwd()
  const errors = runChecks(root)
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`)
    process.exit(1)
  }
  console.log('✓ 文档健康检查通过')
}
