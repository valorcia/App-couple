import base from '@couple/config/eslint';

const config = [
  ...base,
  {
    // NestJS : l'injection de dépendances exige des imports de valeur pour les classes utilisées en type.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
];
export default config;
