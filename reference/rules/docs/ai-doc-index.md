---
id: docs/ai-doc-index
category: docs
exclusive-with: null
---

## Applies When
- 项目 `docs/` 下的文档数量超过 3 篇。

## Do Not Apply When
- 项目文档少于等于 3 篇，此时索引本身即噪音。

## Output Target
`## 文档规范`

## Rule
- `docs/index.md` 是给 AI 使用的文档索引，只放标题与链接。
- 不要把 `docs/index.md` 放进文档站的内容目录 —— 因为它面向 AI 而非读者，出现在站点导航里会造成重复入口。
- README 保持简洁，只放项目介绍、核心功能、快速开始和文档入口。
- 不要在 README 里展开详细功能说明 —— 因为它会与正式功能文档分叉，两处都要维护而人只会更新其中一处。

## Verification
- 自查：新增文档后，`docs/index.md` 是否已补上对应条目？
- 命令：`node scripts/check-docs.mjs` 返回 0，确认索引中无死链。
