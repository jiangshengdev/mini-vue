import type { SetupComponent } from '@/index.ts'

export interface Todo {
  id: number
  text: string
}

export const TodoItem: SetupComponent<{ todo: Todo }> = ({ todo }) => {
  return () => {
    return <li>{todo?.text}</li>
  }
}
