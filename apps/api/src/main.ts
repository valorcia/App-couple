import { createApp } from './app.factory';
import { ENV, type Env } from './config/env';

async function bootstrap() {
  const app = await createApp();
  const env = app.get<Env>(ENV);
  await app.listen(env.API_PORT, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ${env.APP_NAME} prête sur ${env.API_PUBLIC_URL} (docs: ${env.API_PUBLIC_URL}/docs)`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
