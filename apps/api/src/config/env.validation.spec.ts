import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('returns typed values for a valid config', () => {
    expect(
      validateEnv({
        PORT: '4000',
        MONGO_URI: 'mongodb://localhost:27017/crewlink',
      }),
    ).toEqual({
      PORT: 4000,
      MONGO_URI: 'mongodb://localhost:27017/crewlink',
    });
  });

  it('defaults PORT to 3000', () => {
    expect(
      validateEnv({ MONGO_URI: 'mongodb+srv://cluster.example.net/crewlink' })
        .PORT,
    ).toBe(3000);
  });

  it('rejects a missing MONGO_URI', () => {
    expect(() => validateEnv({})).toThrow(/MONGO_URI/);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() =>
      validateEnv({ PORT: 'abc', MONGO_URI: 'mongodb://localhost/crewlink' }),
    ).toThrow(/PORT/);
  });
});
