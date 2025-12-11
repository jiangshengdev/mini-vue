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
        </nav>
        <main class="main">
          <RouterView router={router} />
        </main>
      </div>
    )
  }
}
