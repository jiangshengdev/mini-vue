/**
 * 负责管理一组副作用生命周期的 `EffectScope` 实现，支持嵌套托管与清理。
 *
 * @remarks
 * - 提供 `effectScope`、`getCurrentScope`、`onScopeDispose` 等 API 统一管理副作用集合。
 * - 与 `effect` 协同，让副作用可以在父子 scope 之间传播与级联清理。
 */
import type { EffectInstance } from './contracts/index.ts'
import { reactivityScopeDisposeOutside } from '@/messages/index.ts'
import { ContextStack, errorContexts, errorPhases, runSilent, runThrowing } from '@/shared/index.ts'

/**
 * 当前正在运行的 `EffectScope` 栈，用于关联副作用与清理。
 *
 * @remarks
 * - 通过栈式结构支持嵌套 scope 场景。
 * - `scope.run()` 执行期间会将当前 scope 压入栈顶。
 */
const effectScopeStack = new ContextStack<EffectScope>()

/**
 * `EffectScope` 负责集中托管多个副作用，统一 `stop` 时可全部清理。
 *
 * @remarks
 * - 支持嵌套 scope，子 scope 会在父 scope 停止时级联销毁。
 * - 通过 `detached` 参数可创建独立 scope，不与父 scope 关联。
 * - 常用于组件级别的副作用管理，组件卸载时统一清理所有副作用。
 *
 * @public
 */
export class EffectScope {
  /**
   * 当前 scope 是否仍可用。
   *
   * @remarks
   * - `stop()` 后将变为 `false`，不再收集新的副作用。
   * - 外部可通过该属性判断 scope 的生命周期状态。
   */
  active = true

  /**
   * 是否与父 scope 断开自动关联。
   *
   * @remarks
   * - `true` 时不会挂载到当前活跃 scope 下，需要手动管理生命周期。
   * - 默认为 `false`，会自动继承现有 scope 的生命周期。
   */
  private readonly detached: boolean

  /**
   * 父级 scope 引用，便于停止时同步移除子节点。
   */
  private parent?: EffectScope

  /**
   * 子 scope 列表，`stop()` 时需要级联销毁。
   */
  private childScopes?: EffectScope[]

  /**
   * 当前 scope 在父 scope 子列表中的索引，便于 `O(1)` 移除。
   */
  private positionInParent?: number

  /**
   * 记录属于该 scope 的副作用实例。
   */
  private readonly effects: EffectInstance[] = []

  /**
   * 由用户通过 `onScopeDispose` 注册的清理回调。
   */
  private readonly cleanups: Array<() => void> = []

  /**
   * 构造函数：创建新的 scope，可选择与父 scope 自动关联。
   *
   * @param detached - 是否与父 scope 断开关联，默认为 `false`
   *
   * @remarks
   * - 非独立 scope 会自动挂载到当前活跃 scope 下，复用其生命周期。
   * - 独立 scope 需要手动调用 `stop()` 进行清理。
   */
  constructor(detached = false) {
    this.detached = detached

    /* 非独立 `scope` 会挂到当前活跃 `scope` 下，复用其生命周期。 */
    const currentScope = effectScopeStack.current

    if (!detached && currentScope) {
      currentScope.trackChildScope(this)
    }
  }

  /**
   * 在当前 scope 上下文中执行回调，使其创建的副作用被自动托管。
   *
   * @param scopeCallback - 要执行的回调函数
   * @returns 回调函数的返回值，若 scope 已停用则返回 `undefined`
   *
   * @remarks
   * - 执行期间会将当前 scope 压入栈顶，回调内创建的 effect/computed 会自动登记到该 scope。
   * - 无论回调如何结束（正常返回或抛出异常），都会恢复先前的 scope 状态。
   *
   * @throws 回调内部抛出的异常会同步向上传播，并在传播前交给 `setErrorHandler` 处理。
   */
  run<T>(scopeCallback: () => T): T | undefined {
    /* `scope` 已停用时直接返回，避免在无效上下文中继续注册副作用。 */
    if (!this.active) {
      return undefined
    }

    return runThrowing(scopeCallback, {
      origin: errorContexts.effectScopeRun,
      handlerPhase: errorPhases.sync,
      beforeRun: () => {
        /* 切换全局活跃 `scope`，确保回调内部的所有副作用归属于当前 `scope`。 */
        effectScopeStack.push(this)
      },
      afterRun() {
        /* 无论回调如何结束，都要恢复先前 `scope`，保持栈式嵌套关系。 */
        effectScopeStack.pop()
      },
    })
  }

  /**
   * 记录一个副作用实例，等待 `scope.stop()` 时统一停止。
   *
   * @param effect - 要托管的副作用实例
   *
   * @remarks
   * - 仅在 scope 仍活跃时登记副作用，避免 `stop()` 之后再次触发清理。
   */
  recordEffect(effect: EffectInstance): void {
    /* 仅在 `scope` 仍活跃时登记副作用，避免 `stop` 之后再次触发清理。 */
    if (this.active) {
      this.effects.push(effect)
    }
  }

  /**
   * 为 scope 注册一次性清理回调，会在 `stop()` 时执行。
   *
   * @param cleanup - 清理函数
   *
   * @remarks
   * - 若 scope 已停止，清理函数会被立即执行而非入队。
   * - 这样可以避免「登记到永远不会再被 `stop` 消费的队列」造成资源无法释放。
   */
  addCleanup(cleanup: () => void): void {
    /*
     * 若 `scope` 已停止（含 `stop` 进行中），对齐 `effect` 的语义：不再入队，而是立刻执行。
     * 这样可以避免「登记到永远不会再被 `stop` 消费的队列」造成资源无法释放。
     */
    if (!this.active) {
      runSilent(cleanup, {
        origin: errorContexts.effectScopeCleanup,
        handlerPhase: errorPhases.sync,
      })

      return
    }

    this.cleanups.push(cleanup)
  }

  /**
   * 停用 scope，停止所有副作用并递归销毁子 scope。
   *
   * @param fromParent - 是否由父 scope 触发的停止，内部使用
   *
   * @remarks
   * - 停止顺序：先停止自身副作用，再执行清理回调，最后级联停止子 scope。
   * - 非 detached scope 会从父级列表中移除自身，防止残留引用。
   * - 重复调用 `stop()` 是安全的，不会产生副作用。
   */
  stop(fromParent = false): void {
    if (!this.active) {
      return
    }

    /* 对齐 `Vue`：`stop` 一开始即标记为 inactive，避免 `stop` 期间继续收集副作用/cleanup。 */
    this.active = false

    /* 逐个停止 `scope` 内缓存的副作用，释放依赖关系。 */
    for (const effect of this.effects) {
      runSilent(
        () => {
          effect.stop()
        },
        {
          origin: errorContexts.effectScopeCleanup,
          handlerPhase: errorPhases.sync,
        },
      )
    }

    this.effects.length = 0

    /* 执行用户注册的清理任务，用于销毁副作用外部资源。 */
    if (this.cleanups.length > 0) {
      for (const cleanup of this.cleanups) {
        runSilent(cleanup, {
          origin: errorContexts.effectScopeCleanup,
          handlerPhase: errorPhases.sync,
        })
      }

      this.cleanups.length = 0
    }

    if (this.childScopes) {
      /* 通知所有子 `scope` 级联 `stop`，并告知它们来源于父级。 */
      for (const scope of this.childScopes) {
        runSilent(
          () => {
            scope.stop(true)
          },
          {
            origin: errorContexts.effectScopeCleanup,
            handlerPhase: errorPhases.sync,
          },
        )
      }

      this.childScopes = undefined
    }

    /* 非 detached `scope` 需要从父级移除，防止残留引用。 */
    if (!this.detached && this.parent && !fromParent) {
      this.parent.removeChildScope(this)
    }

    this.parent = undefined
  }

  /**
   * 记录子 scope，并缓存其在父级数组中的位置，方便快速删除。
   *
   * @param scope - 要记录的子 scope
   */
  private trackChildScope(scope: EffectScope): void {
    scope.parent = this
    /* 记录当前 `scope` 在列表中的位置，方便 `O(1)` 交换删除。 */
    scope.positionInParent = this.childScopes?.length ?? 0

    if (this.childScopes) {
      this.childScopes.push(scope)
    } else {
      this.childScopes = [scope]
    }
  }

  /**
   * 将指定子 scope 从父级列表中移除，保持索引连续性。
   *
   * @param scope - 要移除的子 scope
   *
   * @remarks
   * - 使用「交换删除」策略：将末尾元素移到待删除位置，实现 O(1) 删除。
   */
  private removeChildScope(scope: EffectScope): void {
    const { childScopes } = this

    if (!childScopes || scope.positionInParent === undefined) {
      return
    }

    const removedPosition = scope.positionInParent

    scope.positionInParent = undefined

    const last = childScopes.pop()

    /* 若 pop 到的刚好是目标 scope，说明其已位于末尾无需重排。 */
    if (!last || last === scope) {
      return
    }

    /* 将末尾元素移到待删除位置，并同步更新其索引缓存。 */
    childScopes[removedPosition] = last
    last.positionInParent = removedPosition
  }
}

/**
 * 创建一个新的 effect scope，可选地与现有 scope 自动关联。
 *
 * @param detached - 是否创建独立 scope，默认为 `false`
 * @returns 新创建的 `EffectScope` 实例
 *
 * @remarks
 * - 非独立 scope 会自动挂载到当前活跃 scope 下。
 * - 独立 scope 需要手动调用 `stop()` 进行清理。
 *
 * @public
 */
export function effectScope(detached = false): EffectScope {
  return new EffectScope(detached)
}

/**
 * 返回当前生效的 scope，供手动记录副作用或注册清理使用。
 *
 * @returns 当前活跃的 `EffectScope`，若不在任何 scope 上下文中则返回 `undefined`
 *
 * @public
 */
export function getCurrentScope(): EffectScope | undefined {
  return effectScopeStack.current
}

/**
 * 内部方法：将副作用记录到指定 scope，默认使用当前活跃 scope。
 *
 * @param effect - 要记录的副作用实例
 * @param scope - 目标 scope，默认为当前活跃 scope
 *
 * @remarks
 * - 该方法供 `effect()`、`computed()` 等内部使用，自动将副作用登记到 scope。
 */
export function recordEffectScope(
  effect: EffectInstance,
  scope: EffectScope | undefined = effectScopeStack.current,
): void {
  scope?.recordEffect(effect)
}

/**
 * 注册 scope 清理回调，仅能在活跃 scope 上下文中调用。
 *
 * @param cleanup - 清理函数，会在 scope 停止时执行
 *
 * @throws 若不在任何 scope 上下文中调用，会抛出 `TypeError`
 *
 * @public
 */
export function onScopeDispose(cleanup: () => void): void {
  const scope = effectScopeStack.current

  /* 若无活跃 scope，说明调用栈不在托管上下文中，直接报错。 */
  if (!scope) {
    throw new TypeError(reactivityScopeDisposeOutside, { cause: scope })
  }

  scope.addCleanup(cleanup)
}

/**
 * 内部方法：为指定 scope 记录清理函数，供 `stop()` 时统一执行。
 *
 * @param cleanup - 清理函数
 * @param scope - 目标 scope，默认为当前活跃 scope
 *
 * @remarks
 * - 与 `onScopeDispose` 不同，该方法不会在无 scope 时抛出异常。
 */
export function recordScopeCleanup(
  cleanup: () => void,
  scope: EffectScope | undefined = effectScopeStack.current,
): void {
  scope?.addCleanup(cleanup)
}
