import { withoutTracking } from '../internals/tracking.ts'

type ArrayMutatorKey =
  | 'push'
  | 'pop'
  | 'shift'
  | 'unshift'
  | 'splice'
  | 'sort'
  | 'reverse'
  | 'copyWithin'
  | 'fill'

type ArrayMutatorMethod<K extends ArrayMutatorKey> = (
  this: unknown[],
  ...args: Parameters<unknown[][K]>
) => ReturnType<unknown[][K]>

const nativeMutators = {
  push: ([] as unknown[]).push,
  pop: ([] as unknown[]).pop,
  shift: ([] as unknown[]).shift,
  unshift: ([] as unknown[]).unshift,
  splice: ([] as unknown[]).splice,
  sort: ([] as unknown[]).sort,
  reverse: ([] as unknown[]).reverse,
  copyWithin: ([] as unknown[]).copyWithin,
  fill: ([] as unknown[]).fill,
} satisfies { [K in ArrayMutatorKey]: ArrayMutatorMethod<K> }

function callUntracked<K extends ArrayMutatorKey>(
  mutator: K,
  thisArg: unknown[],
  ...args: Parameters<unknown[][K]>
): ReturnType<unknown[][K]> {
  return withoutTracking(() => {
    const nativeMethod = nativeMutators[mutator] as ArrayMutatorMethod<K>

    return nativeMethod.call(thisArg, ...args)
  })
}

function pushUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['push']>
): ReturnType<unknown[]['push']> {
  return callUntracked('push', this, ...args)
}

function popUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['pop']>
): ReturnType<unknown[]['pop']> {
  return callUntracked('pop', this, ...args)
}

function shiftUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['shift']>
): ReturnType<unknown[]['shift']> {
  return callUntracked('shift', this, ...args)
}

function unshiftUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['unshift']>
): ReturnType<unknown[]['unshift']> {
  return callUntracked('unshift', this, ...args)
}

function spliceUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['splice']>
): ReturnType<unknown[]['splice']> {
  return callUntracked('splice', this, ...args)
}

function sortUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['sort']>
): ReturnType<unknown[]['sort']> {
  return callUntracked('sort', this, ...args)
}

function reverseUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['reverse']>
): ReturnType<unknown[]['reverse']> {
  return callUntracked('reverse', this, ...args)
}

function copyWithinUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['copyWithin']>
): ReturnType<unknown[]['copyWithin']> {
  return callUntracked('copyWithin', this, ...args)
}

function fillUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['fill']>
): ReturnType<unknown[]['fill']> {
  return callUntracked('fill', this, ...args)
}

export const arrayUntrackedMutators = {
  push: pushUntracked,
  pop: popUntracked,
  shift: shiftUntracked,
  unshift: unshiftUntracked,
  splice: spliceUntracked,
  sort: sortUntracked,
  reverse: reverseUntracked,
  copyWithin: copyWithinUntracked,
  fill: fillUntracked,
} satisfies { [K in ArrayMutatorKey]: ArrayMutatorMethod<K> }

export function isArrayMutatorKey(key: PropertyKey): key is keyof typeof arrayUntrackedMutators {
  return typeof key === 'string' && Object.hasOwn(arrayUntrackedMutators, key)
}
