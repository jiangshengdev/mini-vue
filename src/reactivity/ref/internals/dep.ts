import { collectEffect, dispatchEffects } from '../../internals/depUtils.ts'
import type { DepTarget } from './types.ts'

export function trackRefValue(target: DepTarget) {
  collectEffect(target.dep)
}

export function triggerRefValue(target: DepTarget) {
  dispatchEffects(target.dep)
}
