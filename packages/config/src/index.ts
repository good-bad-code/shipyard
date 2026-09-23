import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  POSTGRES_HOST: z.string().default("127.0.0.1"),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_USER: z.string().min(1).default("shipyard"),
  POSTGRES_PASSWORD: z.string().min(1).default("shipyard"),
  POSTGRES_DB: z.string().min(1).default("shipyard"),

  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().default(""),

  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM: z.string().email().default("noreply@shipyard.local")
});

export type ShipyardEnv = z.infer<typeof envSchema>;

export interface ShipyardConfig {
  env: ShipyardEnv;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    url: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    from: string;
  };
}

export function loadConfig(rawEnv: NodeJS.ProcessEnv = process.env): ShipyardConfig {
  const env = envSchema.parse(rawEnv);
  const redisPasswordFragment = env.REDIS_PASSWORD
    ? `:${encodeURIComponent(env.REDIS_PASSWORD)}@`
    : "";

  return {
    env,
    database: {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      url: `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
      url: `redis://${redisPasswordFragment}${env.REDIS_HOST}:${env.REDIS_PORT}`
    },
    email: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      from: env.SMTP_FROM
    }
  };
}
