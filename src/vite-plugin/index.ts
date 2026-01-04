import type { PluginOption } from 'vite'
import type { MiniVueDevtoolsSetupComponentFilePluginOptions } from './devtools-setup-component-file.ts'
import { miniVueDevtoolsSetupComponentFilePlugin } from './devtools-setup-component-file.ts'
import type { MiniVueDevtoolsSetupStateNamesPluginOptions } from './devtools-setup-state-names.ts'
import { miniVueDevtoolsSetupStateNamesPlugin } from './devtools-setup-state-names.ts'
import type { MiniVueTransformPropsDestructurePluginOptions } from './transform-props-destructure.ts'
import { miniVueTransformPropsDestructurePlugin } from './transform-props-destructure.ts'
import type { MiniVueTransformModelBindingWritebackPluginOptions } from './transform-v-model-writeback.ts'
import { miniVueTransformModelBindingWritebackPlugin } from './transform-v-model-writeback.ts'

export interface MiniVueCompilerPluginOptions {
  importSource?: string
  devtoolsSetupComponentFile?: false | MiniVueDevtoolsSetupComponentFilePluginOptions
  devtoolsSetupStateNames?: false | MiniVueDevtoolsSetupStateNamesPluginOptions
  transformPropsDestructure?: false | MiniVueTransformPropsDestructurePluginOptions
  transformModelBindingWriteback?: false | MiniVueTransformModelBindingWritebackPluginOptions
}

export function miniVueCompilerPlugin(options: MiniVueCompilerPluginOptions = {}): PluginOption[] {
  const plugins: PluginOption[] = []
  const {
    importSource,
    devtoolsSetupComponentFile,
    devtoolsSetupStateNames,
    transformPropsDestructure,
    transformModelBindingWriteback,
  } = options

  if (transformPropsDestructure !== false) {
    plugins.push(miniVueTransformPropsDestructurePlugin(transformPropsDestructure ?? {}))
  }

  if (transformModelBindingWriteback !== false) {
    plugins.push(miniVueTransformModelBindingWritebackPlugin(transformModelBindingWriteback ?? {}))
  }

  if (devtoolsSetupComponentFile !== false) {
    const devtoolsOptions = devtoolsSetupComponentFile ?? {}

    plugins.push(
      miniVueDevtoolsSetupComponentFilePlugin({
        importSource,
        ...devtoolsOptions,
      }),
    )
  }

  if (devtoolsSetupStateNames !== false) {
    const devtoolsOptions = devtoolsSetupStateNames ?? {}

    plugins.push(
      miniVueDevtoolsSetupStateNamesPlugin({
        importSource,
        ...devtoolsOptions,
      }),
    )
  }

  return plugins
}

export { miniVueDevtoolsSetupComponentFilePlugin } from './devtools-setup-component-file.ts'
export type { MiniVueDevtoolsSetupComponentFilePluginOptions } from './devtools-setup-component-file.ts'
export { miniVueDevtoolsSetupStateNamesPlugin } from './devtools-setup-state-names.ts'
export type { MiniVueDevtoolsSetupStateNamesPluginOptions } from './devtools-setup-state-names.ts'
export { miniVueTransformPropsDestructurePlugin } from './transform-props-destructure.ts'
export type {
  DiagnosticLevel,
  MiniVueTransformPropsDestructureDiagnosticsOptions,
  MiniVueTransformPropsDestructurePluginOptions,
} from './transform-props-destructure.ts'
export {
  miniVueTransformModelBindingWritebackPlugin,
  miniVueTransformModelBindingWritebackPluginName,
} from './transform-v-model-writeback.ts'
export type { MiniVueTransformModelBindingWritebackPluginOptions } from './transform-v-model-writeback.ts'
