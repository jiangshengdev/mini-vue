import type { SetupComponent } from '@/index.ts'

export const BasicIndex: SetupComponent = () => {
  return () => {
    return (
      <section class="card">
        <h2>基础示例</h2>
        <p>下方导航列出了基础示例，点击左侧链接即可切换不同的演示页面。</p>
      </section>
    )
  }
}
