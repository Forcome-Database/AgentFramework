#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SECTIONS = ['Applies When', 'Do Not Apply When', 'Output Target', 'Rule', 'Verification']

export function parseRuleBlock (text, relPath) {
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!fmMatch) throw new Error(`${relPath}: 缺少 frontmatter`)
  const fm = {}
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/)
    if (m) fm[m[1]] = m[2].trim()
  }
  const body = text.slice(fmMatch[0].length)
  const sections = {}
  let current = null
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^## (.+?)\s*$/)
    if (h) { current = h[1]; sections[current] = []; continue }
    if (current && line.trim() !== '') sections[current].push(line.trimEnd())
  }
  const raw = fm['exclusive-with']
  return {
    relPath,
    id: fm.id,
    category: fm.category,
    exclusiveWith: raw === 'null' || raw === undefined ? null : raw,
    hasExclusiveKey: Object.prototype.hasOwnProperty.call(fm, 'exclusive-with'),
    sections
  }
}

export function validateBlock (block) {
  const errors = []
  const { relPath } = block
  if (!block.id) errors.push(`${relPath}: frontmatter 缺少 id`)
  if (!block.category) errors.push(`${relPath}: frontmatter 缺少 category`)
  if (!block.hasExclusiveKey) errors.push(`${relPath}: frontmatter 缺少 exclusive-with`)

  const expectedId = `${block.category}/${path.basename(relPath, '.md')}`
  if (block.id && block.category && block.id !== expectedId) {
    errors.push(`${relPath}: id 应为 ${expectedId}，实际为 ${block.id}`)
  }

  for (const name of SECTIONS) {
    const lines = block.sections[name]
    if (!lines || lines.length === 0) errors.push(`${relPath}: 字段 ${name} 缺失或为空`)
  }

  const target = (block.sections['Output Target'] || []).join(' ').trim()
  const legal = target === 'PREAMBLE' || target === 'GENERATION_ONLY' || /^`?## /.test(target)
  if (target && !legal) {
    errors.push(`${relPath}: Output Target 取值非法：${target}`)
  }

  for (const line of block.sections.Rule || []) {
    if (/^- 不要/.test(line) && !line.includes('因为')) {
      errors.push(`${relPath}: 禁令缺少「因为」，不符合三段式：${line}`)
    }
  }
  return errors
}

export function validatePartition (blocks) {
  const errors = []
  const seen = new Map()
  for (const b of blocks) {
    const key = JSON.stringify([
      b.sections['Applies When'] || [],
      b.sections['Do Not Apply When'] || [],
      b.sections['Output Target'] || []
    ])
    if (seen.has(key)) {
      errors.push(`三元组重复：${seen.get(key)} 与 ${b.id} 的 Applies When / Do Not Apply When / Output Target 完全相同，必须合并为同一块`)
    } else {
      seen.set(key, b.id)
    }
  }
  return errors
}

export function validateExclusivePairs (blocks) {
  const errors = []
  const byId = new Map(blocks.map((b) => [b.id, b]))
  for (const b of blocks) {
    if (!b.exclusiveWith) continue
    const peer = byId.get(b.exclusiveWith)
    if (!peer) {
      errors.push(`${b.id}: exclusive-with 指向不存在的块 ${b.exclusiveWith}`)
      continue
    }
    if (peer.exclusiveWith !== b.id) {
      errors.push(`${b.id}: 对手块 ${peer.id} 未反向引用本块`)
    }
  }
  return errors
}

// 自动档会让 AI 直接动手改文件，所以作用域有两个上限，缺一不可：
//   位置上限 —— 仓库内的字面相对路径
//   类型上限 —— .md 文件，或 docs/ 下的目录
//
// 位置上限的四条检查都是有来历的，不要删：
//   ~ / $ / %  —— 家目录与环境变量形态。注释曾声称挡住 ~/.claude/CLAUDE.md，
//                 实际放行了它。这个框架的题材就是 CLAUDE.md，作者写一个
//                 「全局 CLAUDE.md 腐烂」的块，最自然的作用域就是那个路径。
//   / 与 X:    —— 绝对路径。
//   ..         —— 目录逃逸。
//   *          —— glob。**/*.md 等于一张全仓库 markdown 的空白支票，
//                 含 .github/ 的机器消费模板与 reference/rules/ 下的规则块自身。
export function isDocScope (scope) {
  const p = scope.replace(/\\/g, '/')

  // 位置上限
  if (/^[~$%]/.test(p)) return false
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p)) return false
  if (p.split('/').includes('..')) return false
  if (p.includes('*')) return false

  // 类型上限
  if (p.endsWith('.md')) return true
  const last = p.split('/').filter(Boolean).pop() ?? ''
  const isDir = p.endsWith('/') || !last.includes('.')
  return (p === 'docs' || p.startsWith('docs/')) && isDir
}

// 一度有过一个「可逆性」枚举（自动 / 报告），试图**提前静态地**判定一个动作
// 安不安全。它在开发中翻改了四次 —— 不是想不清楚，是这个问题在静态层面无解：
// 安不安全依赖具体项目，不依赖规则。
//
// 现在的判据是一个**事实**而不是一个判断：**这个块写不写文件？**
//
//   声明了 作用域  → 它会写这些文件，且只能写这些文件（isDocScope 强制）
//   没有 作用域    → 它一个文件都不写，只报告
//
// 档位是从这个事实里**推导**出来的，不是另外贴的一个标签。少一个枚举，少一处
// 会分叉的事实，少一张要同步的 README 表格。
export function validateRemediation (block) {
  const errors = []
  const { relPath } = block
  const scan = block.sections['Legacy Scan']
  const rem = block.sections.Remediation

  if (rem && (!scan || scan.length === 0)) {
    errors.push(`${relPath}: 有 Remediation 却无 Legacy Scan —— 无扫描依据的整理动作无从触发`)
  }

  if (rem) {
    if (rem.some((l) => l.includes('可逆性'))) {
      errors.push(`${relPath}: Remediation 不再有「可逆性」字段。写不写文件由是否声明「作用域」决定 —— 那是一个事实，不是一个判断`)
    }

    const scopeLine = rem.find((l) => l.includes('作用域'))
    const scopeRaw = scopeLine && scopeLine.match(/作用域[：:]\s*(.+)$/)
    const scopes = scopeRaw ? scopeRaw[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean) : []

    for (const s of scopes) {
      if (!isDocScope(s)) {
        errors.push(`${relPath}: 作用域 ${s} 不合法 —— 只许写仓库内的文档：.md 文件或 docs/ 下的目录。绝对路径、家目录（~ $ %）、.. 逃逸、glob 一律拒绝`)
      }
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

export function loadBlocks (rulesDir) {
  const blocks = []
  for (const category of fs.readdirSync(rulesDir)) {
    const dir = path.join(rulesDir, category)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      const abs = path.join(dir, file)
      const rel = `${category}/${file}`
      blocks.push(parseRuleBlock(fs.readFileSync(abs, 'utf8'), rel))
    }
  }
  return blocks
}

export function runValidation (rulesDir) {
  const blocks = loadBlocks(rulesDir)
  return [
    ...blocks.flatMap(validateBlock),
    ...blocks.flatMap(validateRemediation),
    ...validatePartition(blocks),
    ...validateExclusivePairs(blocks)
  ]
}

// import.meta.url 是 percent-encoded 的 file:// URL。含非 ASCII 字符的路径必须用
// fileURLToPath 解码，否则与 process.argv[1] 的比较永远为 false，CLI 静默不执行并退出 0。
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  const dir = process.argv[2] || path.join(process.cwd(), 'reference', 'rules')
  const errors = runValidation(dir)
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`)
    console.error(`\n${errors.length} 处违规`)
    process.exit(1)
  }
  console.log(`✓ ${loadBlocks(dir).length} 个规则块全部通过`)
}
