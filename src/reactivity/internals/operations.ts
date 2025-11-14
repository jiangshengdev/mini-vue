import { effectScope } from './effectScope.ts'
import type { Dep, EffectInstance } from '../shared/types.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 */
class DepRegistry {
  /**
   * 使用 WeakMap 建立目标对象到属性依赖集合的索引结构。
   */
  private readonly targetMap = new WeakMap<object, Map<PropertyKey, Dep>>()

  /**
   * 把当前活跃副作用加入目标字段的依赖集合。
   */
  track(target: object, key: PropertyKey) {
    const currentEffect = effectScope.current
    if (!currentEffect) {
      return
    }

    const dep = this.ensureDep(target, key)
    if (dep.has(currentEffect)) {
      return
    }

    dep.add(currentEffect)
    currentEffect.recordDependency(dep)
  }

  /**
   * 触发指定字段的依赖集合，逐个执行对应副作用。
   */
  trigger(target: object, key: PropertyKey) {
    const dep = this.existingDep(target, key)
    if (!dep) {
      return
    }

    /* 通过快照避免执行期间对同一集合的结构性修改 */
    for (const effect of this.snapshot(dep)) {
      if (this.shouldRun(effect)) {
        effect.run()
      }
    }
  }

  /**
   * 确保目标字段具备依赖集合，不存在时创建新集合。
   */
  private ensureDep(target: object, key: PropertyKey): Dep {
    let depsMap = this.targetMap.get(target)
    if (!depsMap) {
      depsMap = new Map()
      this.targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (!dep) {
      dep = new Set()
      depsMap.set(key, dep)
    }
    return dep
  }

  /**
   * 读取已存在的依赖集合，不创建新条目。
   */
  private existingDep(target: object, key: PropertyKey) {
    return this.targetMap.get(target)?.get(key)
  }

  /**
   * 返回依赖集合的快照，确保触发期间的迭代稳定。
   */
  private snapshot(dep: Dep): Dep {
    return new Set(dep)
  }

  /**
   * 避免当前正在运行的副作用以及已停止的副作用被重复触发。
   */
  private shouldRun(effect: EffectInstance) {
    return effect !== effectScope.current && effect.active
  }
}

const registry = new DepRegistry()

export function track(target: object, key: PropertyKey) {
  registry.track(target, key)
}

export function trigger(target: object, key: PropertyKey) {
  registry.trigger(target, key)
}
