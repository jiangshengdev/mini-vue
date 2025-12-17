/**
 * 子节点卸载工具。
 */
import type { MountedHandle } from '../mount/handle.ts'

/**
 * 卸载子节点，执行 teardown 清理。
 */
export function unmountChild<HostNode>(handle: MountedHandle<HostNode> | undefined): void {
  handle?.teardown()
}
