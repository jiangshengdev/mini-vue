import './style.css'
import { createApp } from '@/jsx/createApp.ts'
import { App } from './App.tsx'
import { setupCounter } from './counter.ts'

const host = document.querySelector<HTMLDivElement>('#app')
if (!host) {
  throw new Error('demo: 未找到 #app 容器')
}

const app = createApp(App)
app.mount(host)

const counterButton = host.querySelector<HTMLButtonElement>('#counter')
if (!counterButton) {
  throw new Error('demo: 未找到 #counter 按钮')
}

setupCounter(counterButton)
