import {
  arraySearchWrappers,
  arrayUntrackedMutators,
  isArrayMutatorKey,
  isArraySearchKey,
} from '../array/index.ts'
import type { ReactiveTarget } from '../contracts/index.ts'
import { iterateDependencyKey, rawFlag, reactiveFlag, triggerOpTypes } from '../contracts/index.ts'
import { isRef } from '../ref/api.ts'
import { track, trigger } from './operations.ts'
import { withoutTracking } from './tracking.ts'
import { isArrayIndex, isObject } from '@/shared/index.ts'

type ShallowGetter = ProxyHandler<ReactiveTarget>['get']

function createShallowGetter(isReadonly: boolean): ShallowGetter {
  return (target, key, receiver) => {
    if (key === reactiveFlag) {
      return !isReadonly
    }

    if (key === rawFlag) {
      return target
    }

    if (Array.isArray(target) && isArrayMutatorKey(key)) {
      return arrayUntrackedMutators[key]
    }

    if (Array.isArray(target) && isArraySearchKey(key)) {
      return arraySearchWrappers[key]
    }

    const rawValue = Reflect.get(target, key, receiver) as unknown

    track(target, key)

    if (!isReadonly && isRef(rawValue)) {
      if (Array.isArray(target) && isArrayIndex(key)) {
        return rawValue
      }

      return rawValue.value
    }

    if (isObject(rawValue)) {
      return rawValue
    }

    return rawValue
  }
}

const shallowSet: ProxyHandler<ReactiveTarget>['set'] = (target, key, value, receiver) => {
  const targetIsArray = Array.isArray(target)
  const keyIsArrayIndex = isArrayIndex(key)
  const hadKey =
    targetIsArray && keyIsArrayIndex ? Number(key) < target.length : Object.hasOwn(target, key)

  const previousValue = withoutTracking(() => {
    return Reflect.get(target, key, receiver) as unknown
  })
  const wasApplied = Reflect.set(target, key, value, receiver)

  if (!wasApplied) {
    return false
  }

  if (!hadKey) {
    trigger(target, key, triggerOpTypes.add, value)

    return true
  }

  if (!Object.is(previousValue, value)) {
    trigger(target, key, triggerOpTypes.set, value)
  }

  return true
}

const shallowDeleteProperty: ProxyHandler<ReactiveTarget>['deleteProperty'] = (target, key) => {
  const hadKey = Object.hasOwn(target, key)
  const wasApplied = Reflect.deleteProperty(target, key)

  if (wasApplied && hadKey) {
    trigger(target, key, triggerOpTypes.delete)
  }

  return wasApplied
}

const shallowHas: ProxyHandler<ReactiveTarget>['has'] = (target, key) => {
  const result = Reflect.has(target, key)

  track(target, key)

  return result
}

const shallowOwnKeys: ProxyHandler<ReactiveTarget>['ownKeys'] = (target) => {
  const key = Array.isArray(target) ? 'length' : iterateDependencyKey

  track(target, key)

  return Reflect.ownKeys(target)
}

const readonlySet: ProxyHandler<ReactiveTarget>['set'] = () => {
  return true
}

const readonlyDeleteProperty: ProxyHandler<ReactiveTarget>['deleteProperty'] = () => {
  return true
}

export const shallowReactiveHandlers = {
  get: createShallowGetter(false),
  set: shallowSet,
  deleteProperty: shallowDeleteProperty,
  has: shallowHas,
  ownKeys: shallowOwnKeys,
} satisfies ProxyHandler<ReactiveTarget>

export const shallowReadonlyHandlers = {
  get: createShallowGetter(true),
  set: readonlySet,
  deleteProperty: readonlyDeleteProperty,
  has: shallowHas,
  ownKeys: shallowOwnKeys,
} satisfies ProxyHandler<ReactiveTarget>
