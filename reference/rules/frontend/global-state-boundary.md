---
id: frontend/global-state-boundary
category: frontend
exclusive-with: null
---

## Applies When
- `package.json` 依赖中存在全局状态库，例如 `zustand`、`pinia`、`redux`、`jotai`、`mobx`。

## Do Not Apply When
- 项目只用组件本地状态与 URL 状态。

## Output Target
`## 前端规范`

## Rule
- 已经放在全局 store 或全局 hook 中的状态与动作，组件需要时直接从对应 store 或 hook 取用。
- 不要为了让组件「纯」而层层透传 props —— 因为透传链上每一层都会因无关变更而重新渲染，且新增一个字段要改动整条链路。
- 不要把全局组件、全局常量、全局配置作为 props 层层传递 —— 因为透传会把全局依赖伪装成局部依赖，掩盖真实的耦合关系。
- 组件优先使用函数组件和现有 hooks。
- 不要新增第二套状态管理方案 —— 因为两套方案并存会让「状态该放哪」失去唯一答案。

## Verification
- 自查：本次新增的 prop，是否只是把某个 store 里的值从父组件传给子组件？若是，子组件应直接从 store 取。
