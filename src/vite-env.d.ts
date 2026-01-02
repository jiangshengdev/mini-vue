/**
 * 扩展 `Vite` 的类型选项，用于控制环境变量声明的严格程度，并声明调试期注入的环境标记。
 * 纯类型补充，不影响运行时逻辑，确保 `import.meta.env` 使用时具备明确约束。
 */
interface ViteTypeOptions {
  /** 打开后将 `ImportMetaEnv` 设为严格模式，禁止未知键值。 */
  strictImportMetaEnv: unknown
}

/**
 * `import.meta.env` 的环境变量类型声明。
 */
interface ImportMetaEnv {
  /** Vitest 浏览器 runner 注入的调试标记，构建时会固化为 `undefined`。 */
  readonly INTERNAL_DEV?: string
}

/**
 * `import.meta` 的类型声明补充，提供对 `env` 的类型约束。
 */
interface ImportMeta {
  /** 注入的环境变量集合，类型由 `ImportMetaEnv` 描述。 */
  readonly env: ImportMetaEnv
}
