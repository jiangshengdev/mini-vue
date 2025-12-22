import { jsxModelBindingConflictWarning, jsxModelBindingNonFormWarning } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

export function warnNonFormElement(type: string, props: unknown): void {
  if (__DEV__) {
    console.warn(jsxModelBindingNonFormWarning(type), props)
  }
}

export function warnConflictProps(type: string, conflicts: string[]): void {
  if (__DEV__ && conflicts.length > 0) {
    console.warn(jsxModelBindingConflictWarning(type, conflicts))
  }
}
