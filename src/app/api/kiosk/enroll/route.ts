import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEVICE_COOKIE } from "@/lib/kiosk-device";
import { recordFailure, retryAfter } from "@/lib/rate-limit";
import { sha256 } from "@/lib/security";
import * as devices from "@/server/repositories/device-repository";
import { fail, guardRequest, readJson, reply } from "../http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await guardRequest(req);
  if (guard.error) return guard.error;
  const keys = [`fail:enroll:${guard.meta.ip}`];

  const wait = await retryAfter(keys);
  if (wait > 0) return fail("Muitas tentativas. Aguarde alguns minutos.", 429, { "Retry-After": String(wait) });

  const parsed = z.object({ token: z.string().min(32).max(128) }).strict().safeParse(await readJson(req));
  const device = parsed.success ? await devices.findByTokenHash(prisma, sha256(parsed.data.token)) : null;
  if (!parsed.success || !device) {
    await recordFailure(keys);
    return fail("Token inválido.", 401);
  }

  (await cookies()).set(DEVICE_COOKIE, parsed.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
  return reply({ success: true });
}
