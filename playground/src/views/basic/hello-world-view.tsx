import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const HelloWorldView: SetupComponent = () => {
  const message = ref('Hello World!')

  return () => {
    return (
      <section class="card">
        <h2>Hello World</h2>
        <h1>{message.value}</h1>
      </section>
    )
  }
}
