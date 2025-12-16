/**
 * 记录一次 `mountChild` 操作生成的宿主节点集合，便于后续卸载或替换。
 */
export interface MountedHandle<HostNode> {
  /** 标记本次挂载链路是否成功完成（与是否产生节点解耦）。 */
  readonly ok: boolean
  /** 按插入顺序记录的宿主节点列表。 */
  readonly nodes: HostNode[]
  /** 清理当前节点及其内部子树的能力。 */
  teardown(): void
}
