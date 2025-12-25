/**
 * 记录一次 `mountChild` 操作生成的宿主节点集合，便于后续卸载或替换。
 *
 * @remarks
 * - `ok` 与 `nodes` 解耦：即使挂载失败（`ok=false`），也可能产生部分节点需要清理。
 * - `teardown` 负责释放副作用（如组件 `effect`、事件监听）并可选地移除宿主节点。
 */
export interface MountedHandle<HostNode> {
  /** 标记本次挂载链路是否成功完成（与是否产生节点解耦）。 */
  readonly ok: boolean
  /** 按插入顺序记录的宿主节点列表，`Fragment`/组件可能包含多个节点。 */
  readonly nodes: HostNode[]
  /**
   * 清理当前节点及其内部子树的能力。
   *
   * @param skipRemove 当父级已移除宿主节点时传入 `true`，跳过 DOM `remove` 但保留逻辑清理。
   */
  teardown(skipRemove?: boolean): void
}
