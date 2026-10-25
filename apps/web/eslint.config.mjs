import { FlatCompat } from '@eslint/eslintrc';
import base from '@couple/config/eslint';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

// Le preset Next d'abord ; la configuration de base (parser TypeScript) prend le dessus ensuite.
const config = [
  ...compat.extends('next/core-web-vitals'),
  ...base,
  { ignores: ['.next/**', 'next-env.d.ts'] },
];
export default config;
