import './style.css'
import { createApp } from '@/index.ts'
import { App } from './App.tsx'

const host = document.querySelector<HTMLDivElement>('#app')

if (!host) {
  throw new Error('demo: 未找到 #app 容器')
}

const app = createApp(App)

app.mount(host)
