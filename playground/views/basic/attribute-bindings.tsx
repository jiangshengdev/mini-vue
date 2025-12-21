import styles from './attribute-bindings.module.css'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const AttributeBindings: SetupComponent = () => {
  const message = state('Hello World!')
  const isRed = state(true)
  const color = state('green')

  const toggleRed = (): void => {
    isRed.set(!isRed.get())
  }

  const toggleColor = (): void => {
    color.set(color.get() === 'green' ? 'blue' : 'green')
  }

  return () => {
    return (
      <section class="card">
        <h2>Attribute Bindings</h2>
        <p>
          <span title={message.get()}>
            Hover your mouse over me for a few seconds to see my dynamically bound title!
          </span>
        </p>
        <p class={isRed.get() ? styles.red : undefined} onClick={toggleRed}>
          This should be red... but click me to toggle it.
        </p>
        <p style={{ color: color.get() }} onClick={toggleColor}>
          This should be green, and should toggle between green and blue on click.
        </p>
      </section>
    )
  }
}
