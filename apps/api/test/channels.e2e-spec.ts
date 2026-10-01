import { ConflictException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { type Model } from 'mongoose';
import { ChannelsModule } from '../src/channels/channels.module.js';
import { ChannelsService } from '../src/channels/channels.service.js';
import { Channel } from '../src/channels/schemas/channel.schema.js';

// Needs MongoDB running (npm run infra:up). Uses its own database so it never touches dev data.
const MONGO_TEST_URI =
  process.env.MONGO_TEST_URI ?? 'mongodb://localhost:27017/crewlink-test';

const sn2903 = {
  flightNumber: 'SN 2903',
  origin: 'BRU',
  destination: 'ZAG',
  scheduledDeparture: new Date('2026-10-01T08:00:00Z'),
  memberIds: ['captain-1', 'purser-1'],
};

describe('ChannelsService (e2e, real MongoDB)', () => {
  let module: TestingModule;
  let service: ChannelsService;
  let channelModel: Model<Channel>;

  beforeAll(async () => {
    // Only the pieces under test: a connection + ChannelsModule, no ConfigModule or .env.
    module = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(MONGO_TEST_URI), ChannelsModule],
    }).compile();

    service = module.get(ChannelsService);
    channelModel = module.get(getModelToken(Channel.name));
    // Index builds are asynchronous; wait so the unique index exists before the duplicate test.
    await channelModel.init();
  });

  beforeEach(async () => {
    await channelModel.deleteMany({});
  });

  afterAll(async () => {
    await channelModel.db.dropDatabase();
    await module.close();
  });

  describe('create', () => {
    it('stores the channel with a normalised flight number', async () => {
      const channel = await service.create(sn2903);

      expect(channel.id).toEqual(expect.any(String));
      expect(channel.flightNumber).toBe('SN2903');
      expect(await channelModel.countDocuments()).toBe(1);
    });

    it('rejects a second channel for the same flight, whatever the spelling', async () => {
      await service.create(sn2903);

      await expect(
        service.create({ ...sn2903, flightNumber: 'sn2903' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows the same flight number on another day', async () => {
      await service.create(sn2903);
      await service.create({
        ...sn2903,
        scheduledDeparture: new Date('2026-10-02T08:00:00Z'),
      });

      expect(await channelModel.countDocuments()).toBe(2);
    });

    it('lets schema validation errors through', async () => {
      await expect(
        service.create({ ...sn2903, origin: 'BRUSSELS' }),
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('findForMember', () => {
    it("returns only the member's channels, earliest departure first", async () => {
      await service.create({
        ...sn2903,
        scheduledDeparture: new Date('2026-10-03T08:00:00Z'),
      });
      await service.create({
        ...sn2903,
        scheduledDeparture: new Date('2026-10-01T08:00:00Z'),
      });
      await service.create({
        ...sn2903,
        flightNumber: 'SN 2904',
        memberIds: ['someone-else'],
      });

      const channels = await service.findForMember('captain-1');

      expect(channels.map((c) => c.scheduledDeparture.toISOString())).toEqual([
        '2026-10-01T08:00:00.000Z',
        '2026-10-03T08:00:00.000Z',
      ]);
    });

    it('returns an empty list for a member without channels', async () => {
      expect(await service.findForMember('nobody')).toEqual([]);
    });
  });
});
