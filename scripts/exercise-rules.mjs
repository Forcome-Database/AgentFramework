#!/usr/bin/env node
// 在一个真实文件系统上，**实际执行**规则块里的每一条命令。
//
// 为什么需要这个：
//
// 规则块的 `Legacy Scan` 与 `Verification` 里装的是 shell 命令。它们是用
// markdown 写的小程序，只有当 LLM 在真实项目上执行手册时才第一次运行。
// 于是每次真实运行都出新 bug —— 不是运气差，是必然。
//
// 框架原有 54 个单元测试，测的全是 scripts/，一个都没测 reference/rules/。
// 而这个框架的立身之本是「Verification 把规则从主张变成可判定的检查」——
// 那些 Verification 命令本身，就是一堆未经验证的主张。
//
// 靶子在 tests/fixtures/rotten-project/：每一种腐烂都是故意种下的，位置与
// 数量已知。harness 把它复制到临时目录、git init、然后逐条跑命令，断言：
//
//   1. 命令能跑（不是语法错、不是 command not found）
//   2. 该抓到的腐烂抓到了
//   3. 故意种下的噪音（嵌套 node_modules、.env）没有被报出来
//
// 本文件允许用 node:child_process 与 node:os —— 见 AGENTS.md 的依赖白名单。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'rotten-project')

// Git Bash。规则块里的命令是 POSIX shell，PowerShell 跑不了。
const BASH = process.env.AGENT_FRAMEWORK_BASH ||
  (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash')

export function setupTarget () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotten-'))
  fs.cpSync(FIXTURE, dir, { recursive: true })

  // 靶子里的占位文件只是为了让 git 能追踪空目录的父级；删掉它们，目录就真空了。
  for (const p of walk(dir)) {
    if (path.basename(p) === '.gitkeep-REMOVE') fs.rmSync(p)
  }
  fs.renameSync(path.join(dir, 'gitignore.template'), path.join(dir, '.gitignore'))
  fs.rmSync(path.join(dir, 'README.md'))

  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
  git('init', '-q')
  git('config', 'user.email', 'fixture@test')
  git('config', 'user.name', 'fixture')
  git('add', '-A')
  git('commit', '-qm', 'rotten')
  return dir
}

function * walk (dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield * walk(p)
    else yield p
  }
}

/** 在靶子里跑一条 shell 命令。返回 { code, stdout, stderr }。 */
export function sh (cmd, cwd) {
  try {
    const stdout = execFileSync(BASH, ['-lc', cmd], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    })
    return { code: 0, stdout, stderr: '' }
  } catch (e) {
    return {
      code: e.status ?? -1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? ''
    }
  }
}

/** 从一个规则块里抠出 `字段` 下的全部命令。命令写在反引号里或围栏代码块里。 */
export function extractCommands (blockText, field) {
  const sec = blockText.split(/^## /m).find((s) => s.startsWith(field + '\n'))
  if (!sec) return []
  const cmds = []
  // 围栏代码块
  for (const m of sec.matchAll(/```(?:bash|sh)?\r?\n([\s\S]*?)```/g)) {
    cmds.push(m[1].trim())
  }
  // 行内 `命令：\`...\`` —— 只取以 shell 关键字开头的，跳过散文里的反引号引用
  for (const line of sec.split(/\r?\n/)) {
    if (!/^-\s*命令[：:]/.test(line)) continue
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const c = m[1].trim()
      if (/^(find|grep|test|git|node|wc|ls|diff|comm|awk|sed)\b/.test(c)) cmds.push(c)
    }
  }
  return cmds
}

/** 一条命令是不是"跑不起来"（而不是"跑了但没命中"）。 */
export function isBroken (r) {
  const s = r.stderr
  return /command not found|syntax error|unexpected|unknown option|invalid option|No such file or directory: |cannot open/i.test(s)
}

export function loadBlocks () {
  const dir = path.join(ROOT, 'reference', 'rules')
  const out = []
  for (const cat of fs.readdirSync(dir)) {
    const cd = path.join(dir, cat)
    if (!fs.statSync(cd).isDirectory()) continue
    for (const f of fs.readdirSync(cd)) {
      if (!f.endsWith('.md')) continue
      out.push({ id: `${cat}/${path.basename(f, '.md')}`, text: fs.readFileSync(path.join(cd, f), 'utf8') })
    }
  }
  return out
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  const target = setupTarget()
  console.log(`靶子：${target}\n`)
  let broken = 0
  let total = 0
  for (const b of loadBlocks()) {
    for (const field of ['Legacy Scan', 'Verification']) {
      for (const cmd of extractCommands(b.text, field)) {
        // 含占位符的命令不能直接跑（<超行文件>、<dir> 等），跳过并单列
        if (/[<>]/.test(cmd.replace(/-\w+\s+[<>]/g, ''))) continue
        total++
        const r = sh(cmd, target)
        if (isBroken(r)) {
          broken++
          console.error(`✗ ${b.id} · ${field}`)
          console.error(`  命令: ${cmd.split('\n')[0].slice(0, 90)}`)
          console.error(`  报错: ${r.stderr.trim().split('\n')[0].slice(0, 120)}\n`)
        }
      }
    }
  }
  fs.rmSync(target, { recursive: true, force: true })
  if (broken) {
    console.error(`${broken}/${total} 条命令跑不起来`)
    process.exit(1)
  }
  console.log(`✓ ${total} 条规则块命令全部可执行`)
}
