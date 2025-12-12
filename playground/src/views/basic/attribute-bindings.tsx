import styles from './attribute-bindings.module.css'
import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const AttributeBindings: SetupComponent = () => {
  const message = ref('Hello World!')
  const isRed = ref(true)
  const color = ref('green')

  const toggleRed = (): void => {
    isRed.value = !isRed.value
  }

  const toggleColor = (): void => {
    color.value = color.value === 'green' ? 'blue' : 'green'
  }

  return () => {
    return (
      <section class="card">
        <h2>Attribute Bindings</h2>
        <p>
          <span title={message.value}>
            Hover your mouse over me for a few seconds to see my dynamically bound title!
          </span>
        </p>
        <p class={isRed.value ? styles.red : undefined} onClick={toggleRed}>
          This should be red... but click me to toggle it.
        </p>
        <p style={{ color: color.value }} onClick={toggleColor}>
          This should be green, and should toggle between green and blue on click.
        </p>
      </section>
    )
  }
}
