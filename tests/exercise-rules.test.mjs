import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupTarget, sh, extractCommands, isBroken, loadBlocks } from '../scripts/exercise-rules.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const block = (id) => loadBlocks().find((b) => b.id === id).text

let T
before(() => { T = setupTarget() })
after(() => { fs.rmSync(T, { recursive: true, force: true }) })

// ─────────────────────────────────────────────────────────
// 第一层：命令跑得起来吗
// ─────────────────────────────────────────────────────────

test('规则块里的每一条命令都能在真实文件系统上执行', () => {
  const bad = []
  for (const b of loadBlocks()) {
    for (const field of ['Legacy Scan', 'Verification']) {
      for (const cmd of extractCommands(b.text, field)) {
        if (/[<>]/.test(cmd.replace(/-\w+\s+[<>]/g, ''))) continue // 含占位符，跳过
        const r = sh(cmd, T)
        if (isBroken(r)) bad.push(`${b.id} · ${field}: ${r.stderr.trim().split('\n')[0]}`)
      }
    }
  }
  assert.deepEqual(bad, [], '规则块里的命令是用 markdown 写的小程序。不跑它们，就只能等 LLM 在真实项目上第一次跑时才发现它们是坏的。')
})

// ─────────────────────────────────────────────────────────
// 第二层：该抓的腐烂抓到了吗
// ─────────────────────────────────────────────────────────

test('legacy/memory-bloat 抓到膨胀的 CLAUDE.md', () => {
  const n = Number(sh('wc -l < CLAUDE.md', T).stdout.trim())
  assert.ok(n > 300, `靶子的 CLAUDE.md 应超过 300 行，实际 ${n}`)
})

test('legacy/doc-index-rot 抓到缺失的索引', () => {
  const r = sh(`node "${path.join(ROOT, 'scripts/check-docs.mjs')}" . --only=doc-index`, T)
  assert.notEqual(r.code, 0, 'docs/ 下 4 篇文档且无 index.md，该分项必须返回非零')
  assert.match(r.stderr, /index\.md 不存在/)
})

test('legacy/vendored-knowledge 抓到约束文件里的第三方库代码', () => {
  const cmds = extractCommands(block('legacy/vendored-knowledge'), 'Legacy Scan')
  const hit = cmds.map((c) => sh(c, T).stdout).join('')
  assert.match(hit, /playwright/, 'CLAUDE.md 里种了一个 from playwright... 的 import，必须被抓到')
})

test('legacy/doc-fork 抓到多行的 CLAUDE.md', () => {
  const n = Number(sh('grep -c . CLAUDE.md', T).stdout.trim())
  assert.ok(n > 1, 'CLAUDE.md 非空行必须多于一行')
})

// ─────────────────────────────────────────────────────────
// 第三层：噪音被放过了吗（这一层才是真正的价值）
// ─────────────────────────────────────────────────────────

test('orphan-abstraction 抓到空的抽象层目录', () => {
  const cmds = extractCommands(block('legacy/orphan-abstraction'), 'Legacy Scan')
  const out = cmds.map((c) => sh(c, T).stdout).join('\n')
  assert.match(out, /backend\/app\/repositories/, '空的 repositories/ 目录必须被抓到')
})

test('orphan-abstraction 抓到只含一个零字节入口文件的目录', () => {
  const cmds = extractCommands(block('legacy/orphan-abstraction'), 'Legacy Scan')
  const out = cmds.map((c) => sh(c, T).stdout).join('\n')
  assert.match(out, /src\/adapters/, 'src/adapters/ 只含一个 0 字节的 __init__.py，必须被抓到')
})

test('orphan-abstraction 不报嵌套 node_modules 下的空目录（prune 必须用 */ 前缀）', () => {
  const cmds = extractCommands(block('legacy/orphan-abstraction'), 'Legacy Scan')
  const out = cmds.map((c) => sh(c, T).stdout).join('\n')
  assert.doesNotMatch(out, /node_modules/,
    'prune 模式若写成 "./node_modules/*"，只排除顶层的那一个 —— monorepo 里 frontend/node_modules/ 会漏网。必须用 "*/node_modules/*"。')
})

test('路径存在门的 gitignore 豁免不会把整道门豁免掉', () => {
  // 靶子的 .gitignore 是 CRLF 且含空行 —— 这是陷阱的触发条件，故意种下的。
  // CRLF 的「空行」是一个孤零零的 反斜杠r，对 git 来说那不是空行，是一个模式。
  // 于是任何**带尾斜杠**的路径都被判为「已忽略」。
  // 在 LF（Linux/Mac）上这个陷阱根本不存在 —— 它只在 Windows 仓库里出现。
  const trap = sh('git check-ignore -q "src/services/api/"', T)
  assert.equal(trap.code, 0,
    '靶子必须重现陷阱，否则这个测试就是在测一个不存在的东西。' +
    '若这里失败，说明 gitignore.template 的 CRLF 行尾被规范化掉了。')

  // 规则块与手册里规定的写法：剥掉尾斜杠再查。
  const fixed = sh('p="src/services/api/"; git check-ignore -q "${p%/}"', T)
  assert.notEqual(fixed.code, 0,
    'src/services/api 不存在也不在 .gitignore 里，剥掉尾斜杠后必须正确判为「未忽略」。' +
    '不剥的话，路径存在门会把每一个不存在的目录都判为「已被 gitignore，豁免」—— ' +
    '这道门就在它被造出来要治的那个场景里彻底失效了。见 docs/pitfalls.md 第 10 条。')

  // 真被 gitignore 的文件仍须豁免（否则修复就修过头了）
  const env = sh('p=".env"; git check-ignore -q "${p%/}"', T)
  assert.equal(env.code, 0, '.env 真的在 .gitignore 里，必须仍被豁免')
})
