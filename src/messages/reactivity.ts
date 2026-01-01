/**
 * 响应式子域消息文案
 *
 * 本模块定义响应式系统相关的错误与警告文案，主要覆盖：
 * - `reactive()`：不支持的目标类型
 * - `computed`：只读 computed 被写入
 * - `effect scope`：生命周期约束违规
 * - `readonly`：只读代理的写入/删除操作
 *
 * 命名约定：`reactivity` + 功能点 + 语义（如 `reactivityComputedReadonly`）
 */

/**
 * `reactive()` 不支持的类型警告
 *
 * `reactive()` 仅支持普通对象（plain object）和数组，
 * 对 Map、Set、WeakMap、WeakSet 等集合类型或原始值会抛出此错误。
 */
export const reactivityUnsupportedType = '当前响应式 API 仅支持普通对象、数组或 Ref，已直接返回原值'

/**
 * 只读 `computed` 被写入时的错误
 *
 * 当 `computed()` 仅传入 getter 函数时，返回的 ref 为只读；
 * 若需要支持写入，应传入 `{ get, set }` 形式的配置对象。
 */
export const reactivityComputedReadonly =
  '当前 computed 为只读，若需要写入请传入 { get, set } 形式的配置'

/**
 * `onScopeDispose` 在非活跃 effect scope 中调用的错误
 *
 * `onScopeDispose()` 必须在活跃的 `effectScope` 内调用，
 * 在 scope 外部或已停止的 scope 中调用会抛出此错误。
 */
export const reactivityScopeDisposeOutside = 'onScopeDispose 仅能在活跃的 effect scope 中调用'

/**
 * 只读代理上尝试写入/删除的警告
 *
 * 通过 `readonly()` 创建的代理会拦截所有写入和删除操作，
 * 在开发态输出此警告并忽略操作，生产态静默忽略。
 */
export const reactivityReadonlyWarning = '当前目标为 readonly，写入/删除操作已被忽略'
