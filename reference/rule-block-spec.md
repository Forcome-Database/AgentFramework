# 规则块格式规范

## 划分判据

规则块按 `Applies When`、`Do Not Apply When`、`Output Target` 三者共同划分。三者完全相同的规则必须合入同一块；任一不同则必须拆开。

「小」是按适用条件拆，「碎」是按规则条数拆。同一适用条件下的十条规则属于同一块。

该判据由 `scripts/validate-rules.mjs` 的 `validatePartition` 强制执行。注意它只能捕获**字面完全相同**的三元组；语义近似的重复需要人工判断，这是新增规则块前必须先读一遍同分类下已有块的原因。

## 五个字段

| 字段 | 语义 | 强制 |
| --- | --- | --- |
| `Applies When` | 选入该块的充分条件，尽量写成可扫描的文件或目录特征 | 是 |
| `Do Not Apply When` | 排除该块的条件，优先级高于 `Applies When` | 是 |
| `Output Target` | 章节名（`## ` 开头）、`PREAMBLE`、或 `GENERATION_ONLY` | 是 |
| `Rule` | 写入目标项目的规则正文 | 是 |
| `Verification` | 可执行命令或自查问句 | 是 |

`Output Target` 的三种取值：

- 章节名：该块的 `Rule` 正文写入目标项目 `AGENTS.md` 的该章节。
- `PREAMBLE`：写入 `AGENTS.md` 顶部的优先级声明段，无标题。
- `GENERATION_ONLY`：只约束 `INIT.md` 的生成行为，不写入目标项目任何位置。

## frontmatter

```
---
id: <category>/<文件名去掉 .md>
category: <core|meta|backend|frontend|docs|release>
exclusive-with: <对手块 id> 或 null
---
```

`id` 一经发布只增不改，因为它被交叉引用。

`exclusive-with` 非 `null` 时，对手块必须反向指回本块。互斥对在 `INIT.md` 阶段 3 由用户二选一，不允许零选或双选。

## 禁令三段式

`Rule` 中每一条以 `- 不要` 开头的条目，必须写成：

> 不要做 X —— 因为 Y（证据 Z）

理由：对一个没有共同历史的新 session 而言，「为什么」比「是什么」更能长期存活。裸禁令会在遇到边界场景时被自由发挥掉。

反例，会被校验器拒绝：

```
- 不要创建空文件。
```

正例：

```
- 不要创建空文件或空目录 —— 因为它们会被后来者误认为未完成的抽象层（证据：调研中有一个项目遗留了空的 `database/repositories/` 目录，是引入抽象层后放弃的痕迹）。
```

## 量化优于模糊

写「2 次修复失败就停下来询问」，不要写「必要时询问」。

写「210/210 单元测试全过」，不要写「确保测试通过」。

禁止使用「合理地」「适当地」「根据情况」。

## Verification 怎么写

两种形式，可混用：

- 命令：一条能跑的 shell 命令，附期望结果。
- 自查：一个能回答「是」或「否」的问句。

不接受「检查代码质量」这类无法判定的表述。
