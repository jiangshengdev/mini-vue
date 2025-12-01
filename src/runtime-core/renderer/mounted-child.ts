/**
 * 记录一次 `mountChild` 操作生成的宿主节点集合，便于后续卸载或替换。
 */
export interface MountedChild<HostNode> {
  /** 按插入顺序记录的宿主节点列表。 */
  readonly nodes: HostNode[]
}
