import { jsxVModelConflictWarning, jsxVModelNonFormWarning } from '@/messages/index.ts'
import { __DEV__ } from '@/shared/index.ts'

export function warnNonFormElement(type: string, props: unknown): void {
  if (__DEV__) {
    console.warn(jsxVModelNonFormWarning(type), props)
  }
}

export function warnConflictProps(type: string, conflicts: string[]): void {
  if (__DEV__ && conflicts.length > 0) {
    console.warn(jsxVModelConflictWarning(type, conflicts))
  }
}
