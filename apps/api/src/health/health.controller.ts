import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
// mongoose is CommonJS: under native ESM only its default export is reliable at runtime.
// Connection must be a type-only import, otherwise decorator metadata keeps it as a value.
import mongoose, { type Connection } from 'mongoose';

const { ConnectionStates } = mongoose;

export interface HealthStatus {
  status: 'ok';
  mongo: 'connected';
}

@Controller('health')
export class HealthController {
  // The Mongoose connection opened by MongooseModule.forRootAsync in AppModule.
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check(): HealthStatus {
    if (this.connection.readyState !== ConnectionStates.connected) {
      // 503 so a load balancer or uptime check takes this instance out of rotation.
      throw new ServiceUnavailableException({
        status: 'error',
        mongo: ConnectionStates[this.connection.readyState],
      });
    }
    return { status: 'ok', mongo: 'connected' };
  }
}
