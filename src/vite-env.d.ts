/**
 * 扩展 `Vite` 的类型选项，用于控制环境变量声明的严格程度。
 */
interface ViteTypeOptions {
  // 添加该字段后，可以将 `ImportMetaEnv` 设为严格模式，从而不允许出现未知的键值。
  strictImportMetaEnv: unknown
}

/**
 * `import.meta.env` 的环境变量类型声明。
 */
interface ImportMetaEnv {
  // 仅 Vitest 浏览器 runner 注入，值为字符串 `'true'` 用于内部调试，构建时被固化为 `undefined`。
  readonly INTERNAL_DEV?: string
  // 更多环境变量...
}

/**
 * `import.meta` 的类型声明补充，提供对 `env` 的类型约束。
 */
interface ImportMeta {
  /** 注入的环境变量集合，类型由 `ImportMetaEnv` 描述。 */
  readonly env: ImportMetaEnv
}
