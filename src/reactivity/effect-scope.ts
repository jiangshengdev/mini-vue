import type { EffectInstance } from './shared/types.ts'

/** 当前正在运行的 effect scope，用于关联副作用与清理。 */
let activeEffectScope: EffectScope | undefined

/**
 * `EffectScope` 负责集中托管多个副作用，统一 stop 时可全部清理。
 */
export class EffectScope {
  /** 当前 scope 是否仍可用，stop 后将不再收集副作用。 */
  active = true

  /** 是否与父 scope 断开自动关联，默认继承现有 scope。 */
  private readonly detached: boolean

  /** 父级 scope 引用，便于停止时同步移除子节点。 */
  private parent?: EffectScope

  /** 子 scope 列表，stop 时需要级联销毁。 */
  private childScopes?: EffectScope[]

  /** 当前 scope 在父 scope 中的索引，便于 O(1) 移除。 */
  private positionInParent?: number

  /** 记录属于该 scope 的副作用实例。 */
  private readonly effects: EffectInstance[] = []

  /** 由用户注册的清理回调。 */
  private readonly cleanups: Array<() => void> = []

  constructor(detached = false) {
    this.detached = detached

    if (!detached && activeEffectScope) {
      activeEffectScope.trackChildScope(this)
    }
  }

  /**
   * 在当前 scope 上下文中执行回调，使其创建的副作用被自动托管。
   */
  run<T>(fn: () => T): T | undefined {
    if (!this.active) {
      return undefined
    }

    const previousScope = activeEffectScope

    setActiveEffectScope(this)

    try {
      return fn()
    } finally {
      setActiveEffectScope(previousScope)
    }
  }

  /**
   * 记录一个副作用，等待 scope stop 时统一停止。
   */
  recordEffect(effect: EffectInstance): void {
    if (this.active) {
      this.effects.push(effect)
    }
  }

  /**
   * 为 scope 注册一次性清理回调。
   */
  addCleanup(cleanup: () => void): void {
    if (this.active) {
      this.cleanups.push(cleanup)
    }
  }

  /**
   * 停用 scope，并停止所有副作用与递归销毁子 scope。
   */
  stop(fromParent = false): void {
    if (!this.active) {
      return
    }

    for (const effect of this.effects) {
      effect.stop()
    }

    for (const cleanup of this.cleanups) {
      cleanup()
    }

    if (this.childScopes) {
      for (const scope of this.childScopes) {
        scope.stop(true)
      }

      this.childScopes = undefined
    }

    if (!this.detached && this.parent && !fromParent) {
      this.parent.removeChildScope(this)
    }

    this.parent = undefined
    this.active = false
  }

  private trackChildScope(scope: EffectScope): void {
    scope.parent = this
    scope.positionInParent = this.childScopes?.length ?? 0

    if (this.childScopes) {
      this.childScopes.push(scope)
    } else {
      this.childScopes = [scope]
    }
  }

  private removeChildScope(scope: EffectScope): void {
    const { childScopes } = this

    if (!childScopes || scope.positionInParent === undefined) {
      return
    }

    const last = childScopes.pop()

    if (!last || last === scope) {
      return
    }

    childScopes[scope.positionInParent] = last
    last.positionInParent = scope.positionInParent
  }
}

/**
 * 创建一个新的 effect scope，可选地与现有 scope 自动关联。
 */
export function effectScope(detached = false): EffectScope {
  return new EffectScope(detached)
}

/**
 * 返回当前生效的 scope，供手动记录副作用或注册清理使用。
 */
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope
}

function setActiveEffectScope(scope: EffectScope | undefined): void {
  activeEffectScope = scope
}

/**
 * 内部方法：将副作用记录到指定 scope，默认使用当前 scope。
 */
export function recordEffectScope(
  effect: EffectInstance,
  scope: EffectScope | undefined = activeEffectScope,
): void {
  scope?.recordEffect(effect)
}

/**
 * 注册 scope 清理回调，仅能在活跃 scope 中调用。
 */
export function onScopeDispose(cleanup: () => void): void {
  const scope = activeEffectScope

  if (!scope) {
    throw new TypeError('onScopeDispose 仅能在活跃的 effect scope 中调用')
  }

  scope.addCleanup(cleanup)
}

/**
 * 内部方法：为指定 scope 记录清理函数，供 stop 时统一执行。
 */
export function recordScopeCleanup(
  cleanup: () => void,
  scope: EffectScope | undefined = activeEffectScope,
): void {
  scope?.addCleanup(cleanup)
}
