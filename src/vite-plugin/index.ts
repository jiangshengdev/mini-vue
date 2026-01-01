import type { PluginOption } from 'vite'
import { miniVueDevtoolsSetupStateNamesPlugin } from './devtools-setup-state-names.ts'
import type { MiniVueDevtoolsSetupStateNamesPluginOptions } from './devtools-setup-state-names.ts'
import { miniVueTransformPropsDestructurePlugin } from './transform-props-destructure.ts'
import type { MiniVueTransformPropsDestructurePluginOptions } from './transform-props-destructure.ts'

export interface MiniVueCompilerPluginOptions {
  importSource?: string
  devtoolsSetupStateNames?: false | MiniVueDevtoolsSetupStateNamesPluginOptions
  transformPropsDestructure?: false | MiniVueTransformPropsDestructurePluginOptions
}

export function miniVueCompilerPlugin(options: MiniVueCompilerPluginOptions = {}): PluginOption[] {
  const plugins: PluginOption[] = []
  const { importSource, devtoolsSetupStateNames, transformPropsDestructure } = options

  if (transformPropsDestructure !== false) {
    plugins.push(miniVueTransformPropsDestructurePlugin(transformPropsDestructure ?? {}))
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
