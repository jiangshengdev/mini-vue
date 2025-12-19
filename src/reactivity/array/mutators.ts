import { runInBatch } from '../internals/batch.ts'
import { withoutTracking } from '../internals/tracking.ts'

/**
 * 需要被特殊处理的数组「变更型」方法名集合。
 *
 * @remarks
 * - 这些方法会修改数组内容/长度。
 * - 在响应式场景里直接调用原生实现，过程中可能读取 length/索引等，从而意外建立依赖。
 */
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

/**
 * 将数组方法的 this/参数/返回值完整对齐到原生签名，便于在包装后仍保持类型精确。
 */
type ArrayMutatorMethod<K extends ArrayMutatorKey> = (
  this: unknown[],
  ...args: Parameters<unknown[][K]>
) => ReturnType<unknown[][K]>

/**
 * 缓存原生 mutator 实现，避免每次取值都从原型链上动态读取。
 *
 * @remarks
 * - 这里取自空数组实例，确保拿到的是标准内建方法。
 * - 通过 call 绑定 thisArg，保持与 `arr.push(...)` 相同的语义。
 */
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

/**
 * 在「暂停依赖收集」的上下文中调用数组变更方法。
 *
 * @remarks
 * - 变更方法内部可能读取 length、遍历或触发 getter，这些读取不应被视为用户态依赖。
 * - 与 `base-handlers` 中对数组方法的拦截配合：读取到的 mutator 直接是该包装版本。
 */
function callUntracked<K extends ArrayMutatorKey>(
  mutator: K,
  thisArg: unknown[],
  ...args: Parameters<unknown[][K]>
): ReturnType<unknown[][K]> {
  return runInBatch(() => {
    return withoutTracking(() => {
      /* 通过预缓存表选择原生实现，避免读取原型链时引入额外行为差异。 */
      const nativeMethod = nativeMutators[mutator] as ArrayMutatorMethod<K>

      return nativeMethod.call(thisArg, ...args)
    })
  })
}

/**
 * `push` 的无追踪版本：用于响应式代理上访问到的 `arr.push`。
 */
function pushUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['push']>
): ReturnType<unknown[]['push']> {
  return callUntracked('push', this, ...args)
}

/**
 * `pop` 的无追踪版本：用于响应式代理上访问到的 `arr.pop`。
 */
function popUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['pop']>
): ReturnType<unknown[]['pop']> {
  return callUntracked('pop', this, ...args)
}

/**
 * `shift` 的无追踪版本：用于响应式代理上访问到的 `arr.shift`。
 */
function shiftUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['shift']>
): ReturnType<unknown[]['shift']> {
  return callUntracked('shift', this, ...args)
}

/**
 * `unshift` 的无追踪版本：用于响应式代理上访问到的 `arr.unshift`。
 */
function unshiftUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['unshift']>
): ReturnType<unknown[]['unshift']> {
  return callUntracked('unshift', this, ...args)
}

/**
 * `splice` 的无追踪版本：用于响应式代理上访问到的 `arr.splice`。
 */
function spliceUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['splice']>
): ReturnType<unknown[]['splice']> {
  return callUntracked('splice', this, ...args)
}

/**
 * `sort` 的无追踪版本：用于响应式代理上访问到的 `arr.sort`。
 */
function sortUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['sort']>
): ReturnType<unknown[]['sort']> {
  return callUntracked('sort', this, ...args)
}

/**
 * `reverse` 的无追踪版本：用于响应式代理上访问到的 `arr.reverse`。
 */
function reverseUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['reverse']>
): ReturnType<unknown[]['reverse']> {
  return callUntracked('reverse', this, ...args)
}

/**
 * `copyWithin` 的无追踪版本：用于响应式代理上访问到的 `arr.copyWithin`。
 */
function copyWithinUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['copyWithin']>
): ReturnType<unknown[]['copyWithin']> {
  return callUntracked('copyWithin', this, ...args)
}

/**
 * `fill` 的无追踪版本：用于响应式代理上访问到的 `arr.fill`。
 */
function fillUntracked(
  this: unknown[],
  ...args: Parameters<unknown[]['fill']>
): ReturnType<unknown[]['fill']> {
  return callUntracked('fill', this, ...args)
}

/**
 * 提供给响应式 Proxy 的数组 mutator 表。
 *
 * @remarks
 * - 仅覆盖「会改动数组」的方法，其他只读方法保持原生读取路径。
 * - 通过 `satisfies` 约束确保每个 key 的签名与原生完全一致。
 */
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

/**
 * 判断某个属性 key 是否为「需要无追踪包装」的数组变更方法。
 *
 * @remarks
 * - 仅接受 string key；symbol 等场景直接返回 false。
 * - 使用 `Object.hasOwn` 保证只匹配表内方法，不走原型链。
 */
export function isArrayMutatorKey(key: PropertyKey): key is keyof typeof arrayUntrackedMutators {
  return typeof key === 'string' && Object.hasOwn(arrayUntrackedMutators, key)
}
