---
inclusion: fileMatch
fileMatchPattern: '**/*.module.css'
---

# CSS 模块使用规范

## 复合选择器命名冲突问题

CSS 模块会为复合选择器中的每个类名生成独立的导出。例如：

```css
/* component.module.css */
.node.highlight {
  border-color: green;
}
```

这会导出两个类名：`node` 和 `highlight`。但 `highlight` 类本身没有独立样式，只有与 `node` 一起使用时才有效。

如果另一个文件中有同名类：

```css
/* shared.module.css */
.highlight {
  background: yellow;
}
```

当合并样式时 `{ ...sharedStyles, ...componentStyles }`，`componentStyles.highlight` 会覆盖 `sharedStyles.highlight`，导致样式丢失。

## 解决方案

### 方案一：使用专用类名（推荐）

为复合选择器中的修饰类使用专用前缀，避免与共享样式冲突：

```css
/* ✅ 正确：使用专用前缀 */
.nodeHighlightAppend {
  border-color: green;
}

.nodeHighlightReplace {
  border-color: orange;
}
```

### 方案二：使用 `:global()` 引用共享类

如果需要引用共享样式中的类名，使用 `:global()` 避免生成新的哈希：

```css
/* ✅ 正确：使用 :global() 引用共享类 */
.node:global(.highlight) {
  border-color: green;
}
```

### 方案三：避免复合选择器

将复合选择器拆分为独立的类：

```css
/* ✅ 正确：独立类名 */
.nodeHighlight {
  border-color: green;
}
```

## 样式合并顺序

合并样式时，后面的对象会覆盖前面的同名属性。

**统一使用**：`{ ...sharedStyles, ...componentStyles }`

组件样式覆盖共享样式是合理的默认行为。如果出现意外覆盖，说明存在命名冲突，应该通过重命名解决，而不是调整合并顺序。

**最佳实践**：避免在不同文件中使用相同的类名，使用专用前缀区分不同用途的样式。
