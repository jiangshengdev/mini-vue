import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const HelloWorld: SetupComponent = () => {
  const message = state('Hello World!')

  return () => {
    return (
      <section class="card">
        <h2>Hello World</h2>
        <h1>{message.get()}</h1>
      </section>
    )
  }
}
