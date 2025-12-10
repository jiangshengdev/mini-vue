import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: false,
  // ...config options
  /* 将 INTERNAL_DEV 编译期固化为 false，仅用于裁剪内部调试日志。 */
  define: {
    'import.meta.env.INTERNAL_DEV': 'false',
  },
  minify: 'dce-only',
})
