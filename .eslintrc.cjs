module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:astro/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y'
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Reglas generales de JavaScript/TypeScript
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Desactivamos para usar la de TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    
    // Reglas de React
    'react/react-in-jsx-scope': 'off', // No necesario con React 17+
    'react/prop-types': 'off', // Usamos TypeScript para tipado
    'react/display-name': 'off',
    'react/no-unescaped-entities': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Reglas de accesibilidad
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/img-redundant-alt': 'warn',
    'jsx-a11y/no-autofocus': 'off', // A veces es necesario para UX
    
    // Reglas de estilo de código
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
  overrides: [
    // Configuración específica para archivos Astro
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      rules: {
        // Desactivar reglas de React que no aplican a Astro
        'react/no-unknown-property': 'off',
        'react/jsx-key': 'off', 
        'react/no-unescaped-entities': 'off',
        
        // Reglas específicas de Astro
        'astro/no-set-html-directive': 'error',
        'astro/no-unused-css-selector': 'warn',
        'astro/prefer-class-list-directive': 'warn',
        'astro/prefer-split-class-list': 'warn',
      },
    },
    // Configuración para archivos de configuración
    {
      files: ['*.config.js', '*.config.mjs', '*.config.ts'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // Configuración para archivos de la API
    {
      files: ['src/pages/api/**/*.ts'],
      rules: {
        'no-console': 'off', // Permitir console.log en APIs para debugging
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.astro/',
    '*.min.js',
    'public/',
  ],
};
