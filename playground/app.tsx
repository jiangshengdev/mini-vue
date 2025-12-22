import type { SetupComponent } from '@/index.ts'
import { RouterLink, RouterView } from '@/index.ts'

export const App: SetupComponent = () => {
  return () => {
    return (
      <div class="layout">
        <nav class="nav">
          <RouterLink class="nav-link" to="/">
            首页
          </RouterLink>
          <RouterLink class="nav-link" to="/counter">
            计数器
          </RouterLink>
          <div class="nav-group">
            <RouterLink class="nav-link" to="/basic">
              基础示例
            </RouterLink>
            <div class="nav-sub">
              <RouterLink class="nav-link nav-sub-link" to="/basic/hello-world">
                你好，世界
              </RouterLink>
              <RouterLink class="nav-link nav-sub-link" to="/basic/handling-user-input">
                处理用户输入
              </RouterLink>
              <RouterLink class="nav-link nav-sub-link" to="/basic/attribute-bindings">
                属性绑定
              </RouterLink>
              <RouterLink class="nav-link nav-sub-link" to="/basic/conditionals-and-loops">
                条件与循环
              </RouterLink>
              <RouterLink class="nav-link nav-sub-link" to="/basic/form-bindings">
                表单绑定
              </RouterLink>
              <RouterLink class="nav-link nav-sub-link" to="/basic/simple-component">
                简单组件
              </RouterLink>
            </div>
          </div>
        </nav>
        <main class="main">
          <RouterView />
        </main>
      </div>
    )
  }
}
