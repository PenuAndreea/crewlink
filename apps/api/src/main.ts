import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { Env } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // On SIGTERM/SIGINT, run onModuleDestroy hooks so the MongoDB connection closes cleanly.
  app.enableShutdownHooks();
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
