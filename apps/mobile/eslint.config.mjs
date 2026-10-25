import base from '@couple/config/eslint';
const config = [...base, { ignores: ['.expo/**', 'expo-env.d.ts'] }];
export default config;
