import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import argon2 from "argon2";
import { env } from "./env";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const pinLookup = (pin: string) => createHmac("sha256", env.PIN_PEPPER).update(pin).digest("hex");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return timingSafeEqual(x, y);
}

const argonOptions = () => ({
  type: argon2.argon2id as 2,
  memoryCost: env.ARGON_MEMORY_KIB,
  timeCost: env.ARGON_TIME_COST,
  parallelism: 1,
});

export const hashSecret = (value: string) => argon2.hash(value, argonOptions());

export const verifySecret = (hash: string, value: string) => argon2.verify(hash, value).catch(() => false);

let dummyHash: Promise<string> | undefined;

export async function burnVerification(value: string) {
  dummyHash ??= hashSecret(randomToken());
  await verifySecret(await dummyHash, value);
}

export function chainHash(previous: string, parts: { employeeId: string; recordedAt: Date; type: string; source: string }) {
  return sha256(
    [previous, parts.employeeId, parts.recordedAt.toISOString(), parts.type, parts.source].join("|"),
  );
}

const encryptionKey = () => createHash("sha256").update(`mfa:${env.SESSION_SECRET}`).digest();

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
}

const COMMON_PINS = new Set(["123123", "112233", "121212", "123321", "654321", "000000", "123456", "1234", "0000"]);
const DATE_LIKE = /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2}|\d{4})?$/;

export function validatePin(pin: string): string | null {
  if (!new RegExp(`^\\d{${env.PIN_LENGTH}}$`).test(pin)) return "PIN com formato inválido.";
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]!);
  if (new Set(digits).size === 1) return "PIN fraco.";
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return "PIN fraco.";
  if (COMMON_PINS.has(pin) || DATE_LIKE.test(pin)) return "PIN fraco.";
  return null;
}

export function generatePin() {
  for (;;) {
    const pin = Array.from({ length: env.PIN_LENGTH }, () => randomInt(10)).join("");
    if (!validatePin(pin)) return pin;
  }
}

const COMMON_PASSWORDS = new Set([
  "password1234", "123456789012", "qwertyuiop12", "admin1234567", "senha1234567", "password12345", "letmein12345",
]);

export function validatePassword(password: string, username: string): string | null {
  if (password.length < 12) return "A senha deve ter ao menos 12 caracteres.";
  if (password.length > 128) return "Senha muito longa.";
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || password.toLowerCase().includes(username.toLowerCase())) {
    return "Senha muito previsível.";
  }
  if (new Set(password).size < 6) return "Senha muito previsível.";
  return null;
}

export function generatePassword() {
  return randomBytes(18).toString("base64url");
}
