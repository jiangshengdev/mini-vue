import styles from './todo-item.module.css'
import type { SetupComponent } from '@/index.ts'

export interface Todo {
  id: number
  text: string
}

export const TodoItem: SetupComponent<{
  todo: Todo
  show?: boolean
  color?: string
}> = (props) => {
  return () => {
    if (props.show === false) {
      return undefined
    }

    let style: { '--item-color': string } | undefined

    if (props.color) {
      style = {
        '--item-color': props.color,
      } satisfies Record<string, string>
    } else {
      style = undefined
    }

    return (
      <li class={styles.item} style={style}>
        {props.todo?.text}
      </li>
    )
  }
}
