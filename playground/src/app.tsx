import { router } from './router/index.ts'
import type { SetupComponent } from '@/index.ts'
import { RouterLink, RouterView } from '@/index.ts'

export const App: SetupComponent = () => {
  return () => {
    return (
      <div class="layout">
        <nav class="nav">
          <RouterLink router={router} to="/">
            首页
          </RouterLink>
          <RouterLink router={router} to="/counter">
            计数器
          </RouterLink>
          <RouterLink router={router} to="/basic">
            基础示例
          </RouterLink>
          <RouterLink router={router} to="/basic/hello-world">
            Hello World
          </RouterLink>
          <RouterLink router={router} to="/basic/handling-user-input">
            Handling User Input
          </RouterLink>
          <RouterLink router={router} to="/basic/attribute-bindings">
            Attribute Bindings
          </RouterLink>
          <RouterLink router={router} to="/basic/conditionals-and-loops">
            Conditionals and Loops
          </RouterLink>
          <RouterLink router={router} to="/basic/form-bindings">
            Form Bindings
          </RouterLink>
          <RouterLink router={router} to="/basic/simple-component">
            Simple Component
          </RouterLink>
        </nav>
        <main class="main">
          <RouterView router={router} />
        </main>
      </div>
    )
  }
}
