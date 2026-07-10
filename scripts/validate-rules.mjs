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
