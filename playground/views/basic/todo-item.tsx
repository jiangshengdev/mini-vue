import type { SetupComponent } from '@/index.ts'

export interface Todo {
  id: number
  text: string
}

export const TodoItem: SetupComponent<{ todo: Todo }> = (props) => {
  return () => {
    return <li>{props.todo?.text}</li>
  }
}
