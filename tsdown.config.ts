import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: false,
  // ...config options
  /*
   * INTERNAL_DEV 仅在 Vitest 浏览器 runner 中注入字符串 'true'，用于内部调试。
   * 构建产物将其固化为 undefined，便于 DCE 剪掉调试分支。
   */
  define: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'import.meta.env.INTERNAL_DEV': 'undefined',
  },
  minify: 'dce-only',
})
