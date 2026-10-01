import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { HealthController } from './health.controller.js';

const { ConnectionStates } = mongoose;

describe('HealthController', () => {
  async function createController(readyState: number) {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      // Replace the real connection with a stub under the same injection token.
      providers: [{ provide: getConnectionToken(), useValue: { readyState } }],
    }).compile();
    return module.get(HealthController);
  }

  it('reports ok when MongoDB is connected', async () => {
    const controller = await createController(ConnectionStates.connected);
    expect(controller.check()).toEqual({ status: 'ok', mongo: 'connected' });
  });

  it('throws 503 when MongoDB is not connected', async () => {
    const controller = await createController(ConnectionStates.disconnected);
    expect(() => controller.check()).toThrow(ServiceUnavailableException);
  });
});
