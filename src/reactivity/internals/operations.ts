import type { DependencyBucket, ReactiveRawTarget, TriggerOpType } from '../contracts/index.ts'
import { iterateDependencyKey, triggerOpTypes } from '../contracts/index.ts'
import { effectStack } from '../effect.ts'
import { trackEffect, triggerEffects } from './dependency.ts'
import { canTrack } from './tracking.ts'
import { isArrayIndex } from '@/shared/index.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 *
 * @remarks
 * - 使用两层 Map 结构：`target -> key -> DependencyBucket`。
 * - 外层使用 WeakMap 避免内存泄漏，内层使用 Map 支持任意 PropertyKey。
 */
class DependencyRegistry {
  /**
   * 使用 WeakMap 建立目标对象到属性依赖集合的索引结构。
   *
   * @remarks
   * - WeakMap 的键为弱引用，当目标对象被垃圾回收时，对应的依赖映射也会被自动清理。
   */
  private readonly targetMap = new WeakMap<ReactiveRawTarget, Map<PropertyKey, DependencyBucket>>()

  /**
   * 把当前活跃副作用加入目标字段的依赖集合。
   *
   * @param target - 响应式代理的原始目标对象
   * @param key - 被访问的属性键
   *
   * @remarks
   * - 当外层显式禁用依赖收集时（如写入阶段读取旧值），会短路跳过。
   * - 没有活跃 effect 时不会创建依赖集合，节省内存。
   */
  track(target: ReactiveRawTarget, key: PropertyKey): void {
    /*
     * 当外层显式禁用依赖收集时（例如：写入阶段读取旧值、创建阶段探测属性），
     * 这里必须短路，否则会把「探测读取」的依赖错误地记录到当前 effect。
     */
    if (!canTrack()) {
      return
    }

    /* 没有活跃 `effect` 时无需创建依赖集合，直接退出节省内存。 */
    const currentEffect = effectStack.current

    if (!currentEffect) {
      return
    }

    /* 获取或创建目标字段对应的依赖集合 */
    const dependencyBucket = this.getOrCreateDep(target, key)

    trackEffect(dependencyBucket, {
      source: 'reactive:get',
      target,
      key,
    })
  }

  /**
   * 触发指定字段的依赖集合，逐个执行对应副作用。
   *
   * @param target - 响应式代理的原始目标对象
   * @param key - 被修改的属性键
   * @param type - 触发操作类型（set/add/delete）
   * @param newValue - 新值，用于数组 length 截断场景的判断
   *
   * @remarks
   * - 根据操作类型决定是否额外触发 iterate 依赖（结构性变化）。
   * - 数组场景有特殊处理：索引变更会触发 iterate，新增索引会触发 length。
   */
  trigger(
    target: ReactiveRawTarget,
    key: PropertyKey,
    type: TriggerOpType,
    newValue?: unknown,
  ): void {
    const depsMap = this.targetMap.get(target)

    if (!depsMap) {
      return
    }

    /* 通过 Set 去重同一次触发中出现的重复依赖。 */
    const depsToRun = new Set<DependencyBucket>()

    /* 工具函数：跳过空集合并统一去重逻辑。 */
    const addDep = (dependencyBucket?: DependencyBucket) => {
      if (!dependencyBucket) {
        return
      }

      depsToRun.add(dependencyBucket)
    }

    /* 首先加入当前字段的直接依赖。 */
    addDep(depsMap.get(key))

    if (type === triggerOpTypes.add || type === triggerOpTypes.delete) {
      /* 结构性变化会影响 for...in/Object.keys，因此额外触发 iterate 依赖。 */
      addDep(depsMap.get(iterateDependencyKey))
    }

    if (Array.isArray(target)) {
      if (type === triggerOpTypes.set && isArrayIndex(key)) {
        /*
         * 数组索引替换会改变元素集合，依赖于 includes/indexOf 等查询结果的副作用需要重跑。
         *
         * @remarks
         * - 这些查询方法在实现层面通常依赖「遍历/比较元素」，属于集合级别依赖。
         * - 因此这里将索引 set 也视为结构性影响的一种，补齐 iterate 的触发。
         */
        addDep(depsMap.get(iterateDependencyKey))
      }

      if (type === triggerOpTypes.add && isArrayIndex(key)) {
        /* 数组新增索引意味着 length 变化，需要同步触发 length 依赖。 */
        addDep(depsMap.get('length'))
      }

      if (key === 'length') {
        /* 主动遍历所有已追踪的索引依赖，以判断哪些受 length 截断影响。 */
        for (const [depKey, dependencyBucket] of depsMap.entries()) {
          if (depKey === 'length') {
            addDep(dependencyBucket)

            continue
          }

          if (isArrayIndex(depKey) && typeof newValue === 'number' && Number(depKey) >= newValue) {
            /* 截断 length 会影响被裁剪索引的副作用。 */
            addDep(dependencyBucket)
          }
        }

        /* `length` 的结构变化同样会破坏遍历顺序，需要同步刷新迭代依赖。 */
        addDep(depsMap.get(iterateDependencyKey))
      }
    }

    if (depsToRun.size === 0) {
      /* 没有任何依赖被收集时直接返回，避免多余遍历。 */
      return
    }

    for (const dependencyBucket of depsToRun) {
      triggerEffects(dependencyBucket)
    }
  }

  /**
   * 确保目标字段具备依赖集合，不存在时创建新集合。
   *
   * @param target - 响应式代理的原始目标对象
   * @param key - 属性键
   * @returns 目标字段对应的依赖集合
   */
  private getOrCreateDep(target: ReactiveRawTarget, key: PropertyKey): DependencyBucket {
    /* 读取或初始化目标对象的依赖映射表 */
    let depsMap = this.targetMap.get(target)

    if (!depsMap) {
      depsMap = new Map()
      this.targetMap.set(target, depsMap)
    }

    /* 读取或初始化目标字段的副作用集合 */
    let dependencyBucket = depsMap.get(key)

    if (!dependencyBucket) {
      dependencyBucket = new Set()
      depsMap.set(key, dependencyBucket)
    }

    return dependencyBucket
  }

  /**
   * 测试用：判断目标字段是否已经创建依赖桶（不关心桶内是否有活跃 effect）。
   *
   * @remarks
   * - 用于验证「无活跃 effect 读取」不会创建空依赖桶，避免测试通过 mock 内部模块实现断言。
   * - 该方法不应被业务逻辑依赖，仅供测试观测内部状态。
   */
  hasDependencyBucket(target: ReactiveRawTarget, key: PropertyKey): boolean {
    const depsMap = this.targetMap.get(target)

    if (!depsMap) {
      return false
    }

    return depsMap.has(key)
  }
}

/** 全局依赖注册表单例。 */
const registry = new DependencyRegistry()

/**
 * 响应式系统对外暴露的依赖收集入口。
 *
 * @param target - 响应式代理的原始目标对象
 * @param key - 被访问的属性键
 *
 * @remarks
 * - 由 Proxy handler 的 get/has/ownKeys 等拦截器调用。
 * - 将当前活跃的 effect 加入目标字段的依赖集合。
 */
export function track(target: ReactiveRawTarget, key: PropertyKey): void {
  registry.track(target, key)
}

/**
 * 响应式系统对外暴露的触发入口。
 *
 * @param target - 响应式代理的原始目标对象
 * @param key - 被修改的属性键
 * @param type - 触发操作类型（set/add/delete）
 * @param newValue - 新值，用于数组 length 截断场景的判断
 *
 * @remarks
 * - 由 Proxy handler 的 set/deleteProperty 等拦截器调用。
 * - 触发目标字段依赖集合中的所有副作用重新执行。
 */
export function trigger(
  target: ReactiveRawTarget,
  key: PropertyKey,
  type: TriggerOpType,
  newValue?: unknown,
): void {
  registry.trigger(target, key, type, newValue)
}

export function __hasDependencyBucket(target: ReactiveRawTarget, key: PropertyKey): boolean {
  return registry.hasDependencyBucket(target, key)
}
