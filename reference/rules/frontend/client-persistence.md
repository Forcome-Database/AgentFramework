---
id: frontend/client-persistence
category: frontend
exclusive-with: null
---

## Applies When
- 项目需要在浏览器本地持久化业务数据。
- 或依赖中已存在 `localforage`、`idb`、`dexie`。

## Do Not Apply When
- 所有数据都来自服务端，前端不做本地持久化。

## Output Target
`## 前端规范`

## Rule
- 业务数据的浏览器本地持久化默认使用 IndexedDB 封装库。项目已有选择时沿用。
- `localStorage` 只用于极小的简单配置。
- 不要用 `localStorage` 保存业务列表、生成记录、图片、base64 或大 JSON —— 因为它是同步 API 且容量上限约 5MB，写入大对象会阻塞主线程并触发配额异常。

## Verification
- 命令：`grep -rn "localStorage.setItem" src/` 的每处命中，其值应为标量或小对象。
