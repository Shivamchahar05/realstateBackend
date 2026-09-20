import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
  SELLER_URL: z.string().url().default('http://localhost:4201'),
  WEB_URL: z.string().url().default('http://localhost:42409'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  /** When true, sequelize.sync({ alter: true }) updates tables from models */
  DB_SYNC_ALTER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  /** Dangerous: drops and recreates all tables */
  DB_SYNC_FORCE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SEED_SUPER_ADMIN_EMAIL: z.string().email(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(8),
  SEED_SUPER_ADMIN_NAME: z.string().min(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
