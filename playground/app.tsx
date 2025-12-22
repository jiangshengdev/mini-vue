import type { SetupComponent } from '@/index.ts'
import { RouterLink, RouterView } from '@/index.ts'

export const App: SetupComponent = () => {
  return () => {
    return (
      <div class="layout">
        <nav class="nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/counter">计数器</RouterLink>
          <RouterLink to="/basic">基础示例</RouterLink>
          <RouterLink to="/basic/hello-world">你好，世界</RouterLink>
          <RouterLink to="/basic/handling-user-input">处理用户输入</RouterLink>
          <RouterLink to="/basic/attribute-bindings">属性绑定</RouterLink>
          <RouterLink to="/basic/conditionals-and-loops">条件与循环</RouterLink>
          <RouterLink to="/basic/form-bindings">表单绑定</RouterLink>
          <RouterLink to="/basic/simple-component">简单组件</RouterLink>
        </nav>
        <main class="main">
          <RouterView />
        </main>
      </div>
    )
  }
}
