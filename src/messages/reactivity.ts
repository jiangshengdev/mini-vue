/** `reactive()` 不支持的类型错误 */
export const reactivityUnsupportedType = 'reactive 目前仅支持普通对象或数组'

/** 只读 `computed` 被写入时的错误 */
export const reactivityComputedReadonly =
  '当前 computed 为只读，若需要写入请传入 { get, set } 形式的配置'

/** `onScopeDispose` 在非活跃 `effect scope` 中调用的错误 */
export const reactivityScopeDisposeOutside = 'onScopeDispose 仅能在活跃的 effect scope 中调用'
