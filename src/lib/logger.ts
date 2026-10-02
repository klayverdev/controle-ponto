const SENSITIVE = /pin|password|senha|token|hash|cookie|authorization|secret|lookup|recovery/i;

export function redact(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[REDACTED]" : redact(v)]),
    );
  }
  return value;
}

type Level = "info" | "warn" | "error";

function write(level: Level, message: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...(redact(data) as object) });
  (level === "error" ? console.error : console.log)(line);
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => write("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => write("warn", message, data),
  error: (message: string, error?: unknown, data?: Record<string, unknown>) =>
    write("error", message, { ...data, error: error instanceof Error ? error.message : undefined }),
};
