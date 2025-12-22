import typescriptLogo from '../assets/typescript.svg'
// eslint-disable-next-line
import viteLogo from '/vite.svg'
import { Counter } from '../components/counter.tsx'
import type { SetupComponent } from '@/index.ts'

export const Home: SetupComponent = () => {
  return () => {
    return (
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} class="logo" alt="Vite Logo" />
        </a>
        <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
          <img src={typescriptLogo} class="logo vanilla" alt="TypeScript Logo" />
        </a>
        <h1>Vite + TypeScript + JSX 示例</h1>
        <div class="card">
          <Counter />
        </div>
        <p class="read-the-docs">点击 Vite 和 TypeScript 的 Logo 了解更多</p>
      </div>
    )
  }
}
