import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Env, validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    // Loads apps/api/.env, validates it, and makes ConfigService injectable everywhere.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // forRootAsync: the connection options come from ConfigService, which only exists
    // once ConfigModule has loaded, so Nest builds them through a factory.
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
      }),
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
