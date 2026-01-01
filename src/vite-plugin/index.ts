import type { PluginOption } from 'vite'
import type { MiniVueDevtoolsSetupStateNamesPluginOptions } from './devtools-setup-state-names.ts'
import { miniVueDevtoolsSetupStateNamesPlugin } from './devtools-setup-state-names.ts'
import type { MiniVueTransformPropsDestructurePluginOptions } from './transform-props-destructure.ts'
import { miniVueTransformPropsDestructurePlugin } from './transform-props-destructure.ts'
import type { MiniVueTransformVmodelWritebackPluginOptions } from './transform-v-model-writeback.ts'
import { miniVueTransformVmodelWritebackPlugin } from './transform-v-model-writeback.ts'

export interface MiniVueCompilerPluginOptions {
  importSource?: string
  devtoolsSetupStateNames?: false | MiniVueDevtoolsSetupStateNamesPluginOptions
  transformPropsDestructure?: false | MiniVueTransformPropsDestructurePluginOptions
  transformVmodelWriteback?: false | MiniVueTransformVmodelWritebackPluginOptions
}

export function miniVueCompilerPlugin(options: MiniVueCompilerPluginOptions = {}): PluginOption[] {
  const plugins: PluginOption[] = []
  const {
    importSource,
    devtoolsSetupStateNames,
    transformPropsDestructure,
    transformVmodelWriteback,
  } = options

  if (transformPropsDestructure !== false) {
    plugins.push(miniVueTransformPropsDestructurePlugin(transformPropsDestructure ?? {}))
  }

  if (transformVmodelWriteback !== false) {
    plugins.push(miniVueTransformVmodelWritebackPlugin(transformVmodelWriteback ?? {}))
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

export {
  miniVueDevtoolsSetupStateNamesPlugin,
  type MiniVueDevtoolsSetupStateNamesPluginOptions,
} from './devtools-setup-state-names.ts'
export {
  type DiagnosticLevel,
  type MiniVueTransformPropsDestructureDiagnosticsOptions,
  miniVueTransformPropsDestructurePlugin,
  type MiniVueTransformPropsDestructurePluginOptions,
} from './transform-props-destructure.ts'
export {
  miniVueTransformVmodelWritebackPlugin,
  miniVueTransformVmodelWritebackPluginName,
  type MiniVueTransformVmodelWritebackPluginOptions,
} from './transform-v-model-writeback.ts'
