import { z } from "zod";

const flag = z.enum(["true", "false"]).default("false").transform((v) => v === "true");
const int = (def: number, min = 0) => z.coerce.number().int().min(min).default(def);

const runtimeEnv = () => {
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};
  return (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? processEnv;
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url(),
  COMPANY_NAME: z.string().min(1).default("Empresa"),
  PIN_PEPPER: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  ADMIN_INITIAL_PASSWORD: z.string().min(12).optional(),
  PIN_LENGTH: int(6, 4).pipe(z.number().max(12)),
  KIOSK_REQUIRE_EMPLOYEE_CODE: flag,
  KIOSK_MIN_INTERVAL_SECONDS: int(60),
  KIOSK_MAX_OPEN_HOURS: int(16, 1),
  KIOSK_ALLOWED_IPS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  TRUST_PROXY: flag,
  SESSION_IDLE_MINUTES: int(30, 1),
  SESSION_ABSOLUTE_HOURS: int(8, 1),
  SUPERVISOR_CAN_CLOSE: flag,
  SUPERVISOR_CAN_RESET_PIN: flag,
  ARGON_MEMORY_KIB: int(19456, 8),
  ARGON_TIME_COST: int(2, 1),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function validateEnv(): Env {
  cached ??= schema.parse(runtimeEnv());
  return cached;
}

export const env = new Proxy({} as Env, {
  get: (_, key: string) => validateEnv()[key as keyof Env],
});
