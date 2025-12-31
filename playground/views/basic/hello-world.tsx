import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const HelloWorld: SetupComponent = () => {
  const message = state('你好，世界！')

  return () => {
    return (
      <section class="card" data-testid="basic-hello-world">
        <h2>你好，世界</h2>
        <h1 data-testid="basic-hello-world-message">{message.get()}</h1>
      </section>
    )
  }
}
