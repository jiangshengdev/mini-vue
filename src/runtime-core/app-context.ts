import type { AppContext } from './create-app.ts'
import { ContextStack } from '@/shared/index.ts'

/** 当前正在执行的应用上下文栈，支持嵌套 render。 */
const appContextStack = new ContextStack<AppContext>()

export function setCurrentAppContext(context: AppContext): void {
  appContextStack.push(context)
}

export function unsetCurrentAppContext(): void {
  appContextStack.pop()
}

export function getCurrentAppContext(): AppContext | undefined {
  return appContextStack.current
}
