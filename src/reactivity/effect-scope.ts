import { runWithErrorChannel } from '../shared/runtime-error-channel.ts'
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

  /**
   * 构造函数可选择与父 scope 自动关联，便于层级 stop 时级联处理。
   */
  constructor(detached = false) {
    this.detached = detached

    /* 非独立 scope 会挂到当前活跃 scope 下，复用其生命周期。 */
    if (!detached && activeEffectScope) {
      activeEffectScope.trackChildScope(this)
    }
  }

  /**
   * 在当前 scope 上下文中执行回调，使其创建的副作用被自动托管。
   *
   * @throws {unknown} 回调内部抛出的异常会同步向上传播，并在传播前交给 setRuntimeErrorHandler 处理。
   */
  run<T>(fn: () => T): T | undefined {
    /* `scope` 已停用时直接返回，避免在无效上下文中继续注册副作用。 */
    if (!this.active) {
      return undefined
    }

    const previousScope = activeEffectScope

    return runWithErrorChannel(fn, {
      origin: 'effect-scope-run',
      handlerPhase: 'sync',
      propagate: 'sync',
      beforeRun: () => {
        /* 切换全局活跃 scope，确保回调内部的所有副作用归属于当前 scope。 */
        setActiveEffectScope(this)
      },
      afterRun() {
        /* 无论回调如何结束，都要恢复先前 scope，保持栈式嵌套关系。 */
        setActiveEffectScope(previousScope)
      },
    })
  }

  /**
   * 记录一个副作用，等待 scope stop 时统一停止。
   */
  recordEffect(effect: EffectInstance): void {
    /* 仅在 scope 仍活跃时登记副作用，避免 stop 之后再次触发清理。 */
    if (this.active) {
      this.effects.push(effect)
    }
  }

  /**
   * 为 scope 注册一次性清理回调。
   */
  addCleanup(cleanup: () => void): void {
    /* 清理函数只会在活跃期收集，防止无主回调导致的潜在泄漏。 */
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

    /* 逐个停止 scope 内缓存的副作用，释放依赖关系。 */
    for (const effect of this.effects) {
      runWithErrorChannel(
        () => {
          effect.stop()
        },
        {
          origin: 'effect-scope-cleanup',
          handlerPhase: 'sync',
          propagate: 'swallow',
        },
      )
    }

    this.effects.length = 0

    /* 执行用户注册的清理任务，用于销毁副作用外部资源。 */
    if (this.cleanups.length > 0) {
      const registeredCleanups = [...this.cleanups]

      this.cleanups.length = 0

      for (const cleanup of registeredCleanups) {
        runWithErrorChannel(cleanup, {
          origin: 'effect-scope-cleanup',
          handlerPhase: 'sync',
          propagate: 'swallow',
        })
      }
    }

    if (this.childScopes) {
      /* 通知所有子 scope 级联 stop，并告知它们来源于父级。 */
      for (const scope of this.childScopes) {
        runWithErrorChannel(
          () => {
            scope.stop(true)
          },
          {
            origin: 'effect-scope-cleanup',
            handlerPhase: 'sync',
            propagate: 'swallow',
          },
        )
      }

      this.childScopes = undefined
    }

    /* 非 detached scope 需要从父级移除，防止残留引用。 */
    if (!this.detached && this.parent && !fromParent) {
      this.parent.removeChildScope(this)
    }

    this.parent = undefined
    this.active = false
  }

  /**
   * 记录子 scope，并缓存其在父级数组中的位置，方便快速删除。
   */
  private trackChildScope(scope: EffectScope): void {
    scope.parent = this
    /* 记录当前 scope 在列表中的位置，方便 O(1) 交换删除。 */
    scope.positionInParent = this.childScopes?.length ?? 0

    if (this.childScopes) {
      this.childScopes.push(scope)
    } else {
      this.childScopes = [scope]
    }
  }

  /**
   * 将指定子 scope 从父级列表中移除，保持索引连续性。
   */
  private removeChildScope(scope: EffectScope): void {
    const { childScopes } = this

    if (!childScopes || scope.positionInParent === undefined) {
      return
    }

    const last = childScopes.pop()

    /* 若 pop 到的刚好是目标 scope，说明其已位于末尾无需重排。 */
    if (!last || last === scope) {
      return
    }

    /* 将末尾元素移到待删除位置，并同步更新其索引缓存。 */
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

/** 更新全局活跃 scope 引用，供 run 切换上下文使用。 */
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

  /* 若无活跃 scope，说明调用栈不在托管上下文中，直接报错。 */
  if (!scope) {
    throw new TypeError('onScopeDispose 仅能在活跃的 effect scope 中调用', { cause: scope })
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
