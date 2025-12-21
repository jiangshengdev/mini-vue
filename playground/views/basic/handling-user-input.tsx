import styles from './handling-user-input.module.css'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const HandlingUserInput: SetupComponent = () => {
  const message = state('Hello World!')

  const reverseMessage = (): void => {
    message.set([...message.get()].reverse().join(''))
  }

  const appendExclamation = (): void => {
    message.set(`${message.get()}!`)
  }

  const notify = (event: Event): void => {
    event.preventDefault()
    // eslint-disable-next-line no-alert
    alert('navigation was prevented.')
  }

  return () => {
    return (
      <section class="card">
        <h2>Handling User Input</h2>
        <h1>{message.get()}</h1>
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
