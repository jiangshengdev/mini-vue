interface ViteTypeOptions {
  // 添加这行代码，你就可以将 ImportMetaEnv 的类型设为严格模式，
  // 这样就不允许有未知的键值了。
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  // 仅 Vitest 浏览器 runner 注入，值为字符串 'true' 用于内部调试，构建时被固化为 undefined。
  readonly INTERNAL_DEV?: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
