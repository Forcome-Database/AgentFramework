#!/usr/bin/env node
// 跨文件事实的一致性检查。
//
// 这个仓库的产出物是文档，而同一个事实往往散在多处：规则块数量写在 README、
// 两个 plugin.json、marketplace.json 和 INIT.md 里；legacy 块的档位写在规则块、
// README 和两份手册里。改了一处忘了另一处，就是 anti-patterns 第 1 条的「双文件
// 内容分叉」—— agent 会捡到过期的那份。
//
// validate-rules.mjs 守规则块的格式，check-docs.mjs 守链接与行数，
// 但「README 说的规则块数 == 实际数量」这类断言，之前一个都没有。
// 开发中因此分叉过十次以上，见 docs/pitfalls.md。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 声明总数的写法。带消歧后缀的（「26 个原有」「26 个参与生成」）不在此列 ——
// 它们说的不是总数，不该被拿去和总数比。
// 只认「N 个规则块」这一种声明总数的写法。
// 不认「N 个块」—— 因为「legacy/ 的 5 个块」说的不是总数，会误报。
// 要表达总数，就必须把「规则块」三个字写全。
const COUNT_PATTERNS = [
  /(\d+)\s*个(?:带\*{0,2}适用条件\*{0,2}的)?规则块/g,
  /(\d+)\s+conditioned rule blocks/g
]

// 一行里出现这些词，说明它是在「教人别这么写」，不是在写。跳过。
// anti-patterns 第 5 条：检查脚本自匹配。占位符门踩过一次，设计文档踩过一次，
// 本脚本第一次跑又踩了一次 —— 它把 INIT.md 里「不能用 ./」那条禁令的定义行
// 判成了违规。
const TEACHING_NOT_TO = /不要|不能用|只排除顶层|漏网|会误报|判成了违规/

const PLACEHOLDER_PATTERNS = [
  { re: /<owner>/g, why: '未替换的仓库占位符' },
  { re: /`\$\{CLAUDE_PLUGIN_ROOT\}[^`]*`/g, why: 'CLAUDE_PLUGIN_ROOT 是 Claude Code 专有变量，Codex 与其它 agent 解不出来' }
]

export function checkCounts (files, actual) {
  const errors = []
  for (const [name, text] of Object.entries(files)) {
    for (const re of COUNT_PATTERNS) {
      re.lastIndex = 0
      for (const m of text.matchAll(re)) {
        const claimed = Number(m[1])
        if (claimed !== actual.total) {
          errors.push(`${name}: 声称有 ${claimed} 个规则块，实际是 ${actual.total} 个（「${m[0].trim()}」）。要表达「参与生成的数量」请写「N 个参与生成」，不要写「N 个规则块」。`)
        }
      }
    }
  }
  return errors
}

export function checkLegacyTiers (readme, blocks) {
  const errors = []
  // README 的档位表：| `doc-fork` | `报告` | ...
  const rowRe = /\|\s*`([a-z-]+)`\s*\|\s*`?(自动|报告)`?\s*\|/g
  for (const m of readme.matchAll(rowRe)) {
    const [, id, claimed] = m
    const truth = blocks[id]
    if (truth === undefined) continue
    if (truth !== claimed) {
      errors.push(`legacy/${id}: README 说「${claimed}」，规则块是「${truth}」。规则块是唯一事实源。`)
    }
  }
  return errors
}

export function checkRuleIdRefs (files, known) {
  const errors = []
  const idRe = /`(core|meta|backend|frontend|docs|release|legacy)\/([a-z0-9-]+)`/g
  for (const [name, text] of Object.entries(files)) {
    for (const m of text.matchAll(idRe)) {
      const id = `${m[1]}/${m[2]}`
      if (!known.has(id)) {
        errors.push(`${name}: 引用了不存在的规则块 ${id} —— 断链。`)
      }
    }
  }
  return errors
}

export function checkPlaceholders (files) {
  const errors = []
  for (const [name, text] of Object.entries(files)) {
    for (const line of text.split(/\r?\n/)) {
      // 「不要依赖 ${CLAUDE_PLUGIN_ROOT}」这类警告行是在教人别用它，放行。
      if (TEACHING_NOT_TO.test(line)) continue
      for (const { re, why } of PLACEHOLDER_PATTERNS) {
        re.lastIndex = 0
        const m = re.exec(line)
        if (m) errors.push(`${name}: ${why} —— 「${m[0]}」`)
      }
    }
  }
  return errors
}

export function checkPrunePatterns (files) {
  const errors = []
  // -not -path "./xxx/*" 只排除顶层的那一个；monorepo 里嵌套的全部漏网。
  const re = /-not\s+-path\s+"\.\/([^"]+)"/g
  for (const [name, text] of Object.entries(files)) {
    for (const line of text.split(/\r?\n/)) {
      if (TEACHING_NOT_TO.test(line)) continue
      re.lastIndex = 0
      for (const m of line.matchAll(re)) {
        errors.push(`${name}: prune 模式 "./${m[1]}" 只排除顶层，monorepo 里嵌套的会漏网。改用 "*/${m[1]}"（证据：docs/pitfalls.md，真实 monorepo 上 ./ 写法漏掉 8 个嵌套目录）。`)
      }
    }
  }
  return errors
}

// README 里带 `id:` 的 markdown 代码块，必须是某个规则块的逐字节原文。
//
// 这道检查不是多余的。写 README 的「规则块长什么样」一节时，作者手打了一段
// 「看起来像」某个规则块的内容并标注「这是真实内容」—— Applies When 与 Rule
// 全是编的，读起来毫无破绽。
//
// 这个框架的每一道门（溯源门、路径存在门）都只管**生成物**，不管 README。
// 手写的示例绕过了全部检查 —— 而 README 是使用者读到的第一份东西。
export function checkExampleBlocks (readme, realBlocks) {
  const errors = []
  const fenceRe = /```markdown\r?\n([\s\S]*?)```/g
  for (const m of readme.matchAll(fenceRe)) {
    const body = m[1]
    const idMatch = body.match(/^id:\s*(\S+)\s*$/m)
    if (!idMatch) continue
    const id = idMatch[1]
    const real = realBlocks[id]
    if (real === undefined) {
      errors.push(`README.md: 示例声称是规则块 ${id}，但该文件不存在。`)
      continue
    }
    if (body.trim() !== real.trim()) {
      errors.push(`README.md: 规则块示例 ${id} 与真实文件不符。README 里的示例必须是 reference/rules/${id}.md 的逐字节原文 —— 手写的示例绕过了溯源门与路径存在门（它们只管生成物），而 README 是使用者读到的第一份东西。`)
    }
  }
  return errors
}

function readIfExists (p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

export function runChecks (root) {
  const errors = []

  // 唯一事实源：文件系统
  const rulesDir = path.join(root, 'reference', 'rules')
  const ids = new Set()
  const tiers = {}
  for (const category of fs.readdirSync(rulesDir)) {
    const dir = path.join(rulesDir, category)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      const name = path.basename(file, '.md')
      ids.add(`${category}/${name}`)
      if (category === 'legacy') {
        const m = fs.readFileSync(path.join(dir, file), 'utf8').match(/^-\s*可逆性[：:]\s*(\S+)/m)
        if (m) tiers[name] = m[1]
      }
    }
  }
  const actual = { total: ids.size }

  const docs = {}
  for (const rel of ['README.md', 'INIT.md', 'REFACTOR.md',
    '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json',
    'skills/init-agents/SKILL.md', 'skills/refactor-legacy/SKILL.md']) {
    const text = readIfExists(path.join(root, rel))
    if (text !== null) docs[rel] = text
  }

  const manuals = {}
  for (const rel of ['INIT.md', 'REFACTOR.md']) {
    if (docs[rel]) manuals[rel] = docs[rel]
  }
  for (const id of ids) {
    const p = path.join(rulesDir, `${id}.md`)
    if (fs.existsSync(p)) manuals[`reference/rules/${id}.md`] = fs.readFileSync(p, 'utf8')
  }

  const realBlocks = {}
  for (const id of ids) {
    realBlocks[id] = fs.readFileSync(path.join(rulesDir, `${id}.md`), 'utf8')
  }

  errors.push(...checkCounts(docs, actual))
  if (docs['README.md']) {
    errors.push(...checkLegacyTiers(docs['README.md'], tiers))
    errors.push(...checkExampleBlocks(docs['README.md'], realBlocks))
  }
  errors.push(...checkRuleIdRefs(docs, ids))
  errors.push(...checkPlaceholders(docs))
  errors.push(...checkPrunePatterns(manuals))

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
    console.error(`\n${errors.length} 处跨文件不一致`)
    process.exit(1)
  }
  console.log('✓ 跨文件一致性检查通过')
}
