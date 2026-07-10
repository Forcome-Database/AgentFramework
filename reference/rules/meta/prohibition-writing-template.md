---
id: meta/prohibition-writing-template
category: meta
exclusive-with: null
---

## Applies When
- 撰写或修改任何规则块的 `Rule` 正文时。

## Do Not Apply When
- 无。

## Output Target
GENERATION_ONLY

## Rule
- 禁令一律写成三段式：不要做 X —— 因为 Y（证据 Z）。
- 不要写裸禁令 —— 因为对一个没有共同历史的新 session 而言，「为什么」比「是什么」更能长期存活（证据：LobeHub 官方写 `NEVER run bun run test - takes ~10 minutes`，把成本理由写进禁令本身）。
- 量化优于模糊。写「2 次修复失败就停下来询问」，写「210/210 单元测试全过」。
- 不要用「合理地」「适当地」「根据情况」这类措辞 —— 因为它们无法被判定，等于没有规则。
- 每条规则必须能被 `Verification` 中的命令或自查问句判定。

## Verification
- 命令：`node scripts/validate-rules.mjs` 返回 0。
- 自查：`Rule` 中每条以「不要」开头的条目，是否都含「因为」？
