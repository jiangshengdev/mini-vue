import './styles/main.css'
import './styles/router.css'
import { App } from './app.tsx'
import { router } from './router'
import type { DomAppInstance } from '@/index.ts'
import { createApp } from '@/index.ts'

const host = document.querySelector<HTMLDivElement>('#app')

if (!host) {
  throw new Error('demo: 未找到 #app 容器')
}

const app: DomAppInstance = createApp(App)

app.use(router)
app.mount(host)
