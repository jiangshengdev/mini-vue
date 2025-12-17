import type { FlatXoConfig } from 'xo'

const xoConfig: FlatXoConfig = [
  {
    space: true,
    prettier: 'compat',
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/parameter-properties': ['error', { allow: [], prefer: 'class-property' }],
      'arrow-body-style': 'off',
      'capitalized-comments': 'off',
      eqeqeq: 'off',
      'func-names': ['error', 'always'],
      'func-name-matching': ['error', 'never'],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
      'import-x/order': 'off',
      'no-eq-null': 'off',
      'no-negated-condition': 'off',
      'prefer-destructuring': 'off',
      'unicorn/prefer-dom-node-dataset': 'off',
      'unicorn/no-abusive-eslint-disable': 'warn',
      'unicorn/no-negated-condition': 'off',
      'unicorn/no-new-array': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/indent-binary-ops': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },
]

export default xoConfig
