import styles from './handling-user-input.module.css'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const HandlingUserInput: SetupComponent = () => {
  const message = state('你好，世界！')

  const reverseMessage = (): void => {
    message.set([...message.get()].reverse().join(''))
  }

  const appendExclamation = (): void => {
    message.set(`${message.get()}！`)
  }

  const notify = (event: Event): void => {
    event.preventDefault()
    // eslint-disable-next-line no-alert
    alert('导航已被阻止。')
  }

  return () => {
    return (
      <section class="card">
        <h2>处理用户输入</h2>
        <h1 class={styles.message}>{message.get()}</h1>
        <button type="button" class={styles.item} onClick={reverseMessage}>
          反转消息
        </button>
        <button type="button" class={styles.item} onClick={appendExclamation}>
          追加 "！"
        </button>
        <a href="https://vuejs.org" class={styles.item} onClick={notify}>
          带 e.preventDefault() 的链接
        </a>
      </section>
    )
  }
}
