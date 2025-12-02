---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'Mini Vue'
  text: '响应式 + JSX 的自学实现'
  tagline: '用几十个文件复刻 Vue 3 核心，学习真实的运行机制'
  actions:
    - theme: brand
      text: 阅读响应式规划
      link: /component-reactivity-plan
    - theme: alt
      text: 查看运行时议题
      link: /runtime-core-issues

features:
  - title: 响应式内核
    details: ReactiveCache、effect、watch 等模块完全开源，覆盖依赖收集、清理以及嵌套生命周期的关键实现。
  - title: JSX 渲染链路
    details: runtime-core 与 runtime-dom 拆分宿主能力，保留最小化 renderer，便于调试挂载与属性更新流程。
  - title: 可验证的实验田
    details: 以 Vitest 测试和 Markdown 文档串联学习路线，适合在阅读源码时快速定位问题并扩展特性。
---
