/**
 * The environment variables the API reads, after validation.
 * Grows with the roadmap (RABBITMQ_URL, JWT_SECRET) as features start using them.
 */
export interface Env {
  PORT: number;
  MONGO_URI: string;
}

/**
 * Passed to ConfigModule.forRoot({ validate }). Runs once at startup with the merged
 * process.env + .env values; throwing here stops the app before anything connects.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const errors: string[] = [];

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push(
      `PORT must be an integer between 1 and 65535, got "${String(config.PORT)}"`,
    );
  }

  const mongoUri = config.MONGO_URI;
  if (typeof mongoUri !== 'string' || !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    errors.push(
      'MONGO_URI must be a mongodb:// or mongodb+srv:// connection string',
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return { PORT: port, MONGO_URI: mongoUri as string };
}
