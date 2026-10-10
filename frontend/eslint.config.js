import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import refresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config({ ignores: ['dist/**'] }, eslint.configs.recommended, ...tseslint.configs.recommended, { files: ['**/*.{ts,tsx}'], languageOptions: { globals: globals.browser }, plugins: { 'react-hooks': hooks, 'react-refresh': refresh }, rules: { ...hooks.configs.recommended.rules, 'no-console': 'error', '@typescript-eslint/no-explicit-any': 'error', 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] } })
