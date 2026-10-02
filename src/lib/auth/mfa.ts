import { authenticator } from "otplib";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { decrypt, encrypt, randomToken, sha256 } from "@/lib/security";

authenticator.options = { window: 1 };

export const newMfaSecret = () => encrypt(authenticator.generateSecret());

export const verifyTotp = (encryptedSecret: string, code: string) =>
  /^\d{6}$/.test(code) && authenticator.check(code, decrypt(encryptedSecret));

export const mfaQr = (encryptedSecret: string, username: string) =>
  QRCode.toDataURL(authenticator.keyuri(username, env.COMPANY_NAME, decrypt(encryptedSecret)));

export const mfaSecretText = (encryptedSecret: string) => decrypt(encryptedSecret);

export function newRecoveryCodes() {
  const plain = Array.from({ length: 8 }, () => randomToken(10));
  return { plain, hashes: plain.map(sha256) };
}
