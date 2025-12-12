import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'
import styles from './handling-user-input.module.css'

export const HandlingUserInput: SetupComponent = () => {
  const message = ref('Hello World!')

  const reverseMessage = (): void => {
    message.value = message.value.split('').reverse().join('')
  }

  const appendExclamation = (): void => {
    message.value += '!'
  }

  const notify = (event: Event): void => {
    event.preventDefault()
    alert('navigation was prevented.')
  }

  return () => {
    return (
      <section class="card">
        <h2>Handling User Input</h2>
        <h1>{message.value}</h1>
        <button type="button" class={styles.item} onClick={reverseMessage}>
          Reverse Message
        </button>
        <button type="button" class={styles.item} onClick={appendExclamation}>
          Append "!"
        </button>
        <a href="https://vuejs.org" class={styles.item} onClick={notify}>
          A link with e.preventDefault()
        </a>
      </section>
    )
  }
}
