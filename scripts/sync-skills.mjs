#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function sha256 (text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function rawUrl (source, skillPath, ref = 'HEAD') {
  return `https://raw.githubusercontent.com/${source}/${ref}/${skillPath}`
}

export async function checkSkill (name, entry, { fetchImpl = fetch } = {}) {
  const url = rawUrl(entry.source, entry.skillPath)
  let res
  try {
    res = await fetchImpl(url)
  } catch (e) {
    return { name, status: 'error', expected: entry.computedHash, actual: null, message: e.message }
  }
  if (!res.ok) {
    return { name, status: 'error', expected: entry.computedHash, actual: null, message: `HTTP ${res.status} ${url}` }
  }
  const actual = sha256(await res.text())
  return {
    name,
    status: actual === entry.computedHash ? 'ok' : 'drift',
    expected: entry.computedHash,
    actual
  }
}

export async function checkAll (lock, opts = {}) {
  const names = Object.keys(lock.skills || {})
  return Promise.all(names.map((n) => checkSkill(n, lock.skills[n], opts)))
}

// 见 docs/pitfalls.md 第 1 条。
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  const args = process.argv.slice(2)
  const checkMode = args.includes('--check')
  const lockPath = args.find((a) => !a.startsWith('--')) || path.join(process.cwd(), '.agents', 'skills-lock.json')

  if (!fs.existsSync(lockPath)) {
    console.error(`✗ 找不到 ${lockPath}`)
    process.exit(1)
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  const results = await checkAll(lock)

  let bad = 0
  for (const r of results) {
    if (r.status === 'ok') {
      console.log(`✓ ${r.name} 已是最新`)
    } else if (r.status === 'drift') {
      bad++
      console.error(`! ${r.name} hash 不匹配`)
      console.error(`    lock 中：${r.expected}`)
      console.error(`    远端为：${r.actual}`)
    } else {
      bad++
      console.error(`✗ ${r.name} 拉取失败：${r.message}`)
    }
  }

  if (results.length === 0) {
    console.log('✓ skills-lock.json 中无条目，无需检查')
  }

  if (!checkMode && bad > 0) {
    console.error('\n同步模式尚未实现写回。请先用 --check 确认漂移，再手工更新 lock。')
  }
  process.exit(bad > 0 ? 1 : 0)
}
