import mongoose from 'mongoose';
import { ChannelSchema } from './channel.schema.js';

// Setters and validators run in memory, so no MongoDB connection is needed.
const ChannelModel = mongoose.model('Channel', ChannelSchema);

const validChannel = {
  flightNumber: 'SN 2903',
  origin: 'BRU',
  destination: 'ZAG',
  scheduledDeparture: new Date('2026-10-01T08:00:00Z'),
  memberIds: ['captain-1', 'purser-1'],
};

function build(overrides: Record<string, unknown> = {}) {
  return new ChannelModel({ ...validChannel, ...overrides });
}

/** The paths that failed validation, e.g. ['flightNumber']. */
async function invalidPaths(
  overrides: Record<string, unknown> = {},
): Promise<string[]> {
  try {
    await build(overrides).validate();
    return [];
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError)
      return Object.keys(error.errors);
    throw error;
  }
}

describe('ChannelSchema', () => {
  it('accepts a valid channel', async () => {
    await expect(invalidPaths()).resolves.toEqual([]);
  });

  describe('flightNumber', () => {
    it.each([
      ['SN 2903', 'SN2903'],
      [' sn 2903 ', 'SN2903'],
      ['sn2903', 'SN2903'],
    ])('normalises %j to %j', (input, stored) => {
      expect(build({ flightNumber: input }).flightNumber).toBe(stored);
    });

    it.each(['U2 1234', '3K 123', 'SN 2903A', 'SN 1'])(
      'accepts %j',
      async (flightNumber) => {
        await expect(invalidPaths({ flightNumber })).resolves.toEqual([]);
      },
    );

    it.each([
      ['12 345', 'airline code with two digits'],
      ['SN', 'no flight number'],
      ['SN 12345', 'more than 4 digits'],
      ['SNX 123', '3-letter (ICAO) airline code'],
      ['SN 2903AB', 'more than one suffix letter'],
    ])('rejects %j (%s)', async (flightNumber) => {
      await expect(invalidPaths({ flightNumber })).resolves.toEqual([
        'flightNumber',
      ]);
    });

    it('is required', async () => {
      await expect(invalidPaths({ flightNumber: undefined })).resolves.toEqual([
        'flightNumber',
      ]);
    });
  });

  describe('origin and destination', () => {
    it('trims and uppercases IATA codes', () => {
      const channel = build({ origin: ' bru ', destination: 'zag' });
      expect(channel.origin).toBe('BRU');
      expect(channel.destination).toBe('ZAG');
    });

    it.each(['BR', 'BRUX', 'B1U', ''])('rejects %j', async (code) => {
      await expect(
        invalidPaths({ origin: code, destination: code }),
      ).resolves.toEqual(['origin', 'destination']);
    });
  });

  it('requires scheduledDeparture', async () => {
    await expect(
      invalidPaths({ scheduledDeparture: undefined }),
    ).resolves.toEqual(['scheduledDeparture']);
  });

  it('declares a unique index on flightNumber + scheduledDeparture', () => {
    // The index itself is enforced by MongoDB; here we only check the schema asks for it.
    expect(ChannelSchema.indexes()).toContainEqual([
      { flightNumber: 1, scheduledDeparture: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });

  it('declares an index on memberIds + scheduledDeparture for the member channel list', () => {
    expect(ChannelSchema.indexes()).toContainEqual([
      { memberIds: 1, scheduledDeparture: 1 },
      expect.anything(),
    ]);
  });
});
