import styles from './simple-component.module.css'
import type { Todo } from './todo-item.tsx'
import { TodoItem } from './todo-item.tsx'
import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const AnchorSimpleComponent: SetupComponent = () => {
  const groceryList = state<Todo[]>([
    { id: 0, text: '蔬菜' },
    { id: 1, text: '奶酪' },
    { id: 2, text: '人类应该吃的其他东西' },
  ])
  const showItems = state(true)

  const getColor = (index: number, total: number): string => {
    if (total <= 0) {
      return 'hsl(0, 0%, 90%)'
    }

    const hue = Math.round((index / total) * 360)

    return `hsl(${hue}, 70%, 85%)`
  }

  const shuffle = (): void => {
    const next = [...groceryList.get()]

    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))

      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    }

    groceryList.set(next)
  }

  return () => {
    const list = groceryList.get()
    const total = list.length || 1
    const itemsWithColor = list.map((item, index) => {
      return {
        item,
        color: getColor(index, total),
      }
    })

    return (
      <section class="card">
        <h2>组件锚点回归</h2>
        <div class={styles.controls}>
          <button class="button" type="button" onClick={shuffle}>
            打乱列表
          </button>
          <button
            class="button"
            type="button"
            onClick={() => {
              showItems.set(!showItems.get())
            }}
          >
            {showItems.get() ? '隐藏子组件内容' : '显示子组件内容'}
          </button>
        </div>
        <div class={styles.listWrapper}>
          <div class={styles.column}>
            <h3 class={styles.columnTitle}>父组件视图</h3>
            <div class={styles.parentList}>
              {itemsWithColor.map(({ item, color }) => {
                return (
                  <span
                    key={item.id}
                    class={styles.item}
                    style={{ backgroundColor: color } as Record<string, string>}
                  >
                    {item.id}:{item.text}
                  </span>
                )
              })}
            </div>
          </div>
          <div class={styles.column}>
            <h3 class={styles.columnTitle}>子组件视图</h3>
            <ol class={styles.childList}>
              {itemsWithColor.map(({ item, color }) => {
                return <TodoItem key={item.id} todo={item} show={showItems.get()} color={color} />
              })}
            </ol>
          </div>
        </div>
      </section>
    )
  }
}
