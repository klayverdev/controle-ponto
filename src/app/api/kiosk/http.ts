import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { requestMeta } from "@/lib/auth/guard";

export const reply = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export const fail = (message: string, status: number, headers?: Record<string, string>) =>
  reply({ success: false, message }, status, headers);

export async function guardRequest(req: Request) {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 1024) return { error: fail("Não foi possível realizar este registro.", 413) };
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return { error: fail("Não foi possível realizar este registro.", 415) };
  }
  if (req.headers.get("origin") !== new URL(env.APP_ORIGIN).origin) return { error: fail("PIN inválido.", 403) };
  const meta = await requestMeta();
  if (env.KIOSK_ALLOWED_IPS.length > 0 && !env.KIOSK_ALLOWED_IPS.includes(meta.ip)) {
    return { error: fail("PIN inválido.", 403), meta };
  }
  return { meta };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
