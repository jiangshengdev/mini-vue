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
          <RouterLink to="/basic/hello-world">Hello World</RouterLink>
          <RouterLink to="/basic/handling-user-input">Handling User Input</RouterLink>
          <RouterLink to="/basic/attribute-bindings">Attribute Bindings</RouterLink>
          <RouterLink to="/basic/conditionals-and-loops">Conditionals and Loops</RouterLink>
          <RouterLink to="/basic/form-bindings">Form Bindings</RouterLink>
          <RouterLink to="/basic/simple-component">Simple Component</RouterLink>
        </nav>
        <main class="main">
          <RouterView />
        </main>
      </div>
    )
  }
}
