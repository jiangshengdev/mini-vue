import styles from './attribute-bindings.module.css'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const AttributeBindings: SetupComponent = () => {
  const message = state('你好，世界！')
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
        <h2>属性绑定</h2>
        <p>
          <span title={message.get()}>鼠标悬停几秒查看动态绑定的 title 属性！</span>
        </p>
        <p class={isRed.get() ? styles.red : undefined} onClick={toggleRed}>
          这里应该是红色……点击切换颜色。
        </p>
        <p style={{ color: color.get() }} onClick={toggleColor}>
          这里应该是绿色，点击后在 green 和 blue 之间切换。
        </p>
      </section>
    )
  }
}
