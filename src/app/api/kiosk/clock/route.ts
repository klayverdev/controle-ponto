import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { consume, countSince, recordFailure, retryAfter } from "@/lib/rate-limit";
import { currentDevice } from "@/lib/kiosk-device";
import { prisma } from "@/lib/db";
import { ClockError, registerTimeRecord } from "@/server/services/register-time-record";
import { recentAlert, writeAudit } from "@/server/repositories/audit-repository";
import { fail, guardRequest, readJson, reply } from "../http";

export const dynamic = "force-dynamic";

const GLOBAL_FAILURES_PER_5_MIN = 30;

async function alertOnGlobalFailures() {
  if ((await countSince("fail:", 300)) >= GLOBAL_FAILURES_PER_5_MIN && (await recentAlert(prisma, 900)) === 0) {
    await writeAudit(prisma, { action: "SECURITY_ALERT", entity: "kiosk", reason: "Excesso de falhas de PIN" });
    logger.warn("kiosk.global_failures");
  }
}

export async function POST(req: Request) {
  const guard = await guardRequest(req);
  if (guard.error) {
    logger.warn("kiosk.rejected", { ip: guard.meta?.ip });
    return guard.error;
  }
  const { ip } = guard.meta;

  const device = await currentDevice();
  const keys = [`fail:ip:${ip}`, ...(device ? [`fail:dev:${device.id}`] : [])];

  if (!device) {
    await recordFailure(keys);
    logger.warn("kiosk.unauthorized_device", { ip });
    return fail("PIN inválido.", 401);
  }

  const wait = await retryAfter(keys);
  if (wait > 0 || !(await consume(`req:ip:${ip}`, 30, 60))) {
    return fail("Muitas tentativas. Aguarde alguns minutos.", 429, { "Retry-After": String(Math.max(wait, 60)) });
  }

  const schema = z
    .object({
      pin: z.string().regex(new RegExp(`^\\d{${env.PIN_LENGTH}}$`)),
      employeeCode: z.string().trim().min(1).max(32).optional(),
    })
    .strict();
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) {
    await recordFailure(keys);
    return fail("PIN inválido.", 400);
  }

  try {
    const result = await registerTimeRecord({ ...parsed.data, deviceId: device.id });
    return reply({ success: true, ...result });
  } catch (error) {
    if (error instanceof ClockError) {
      logger.warn("kiosk.denied", { ip, device: device.id, reason: error.reason });
      if (error.kind === "INVALID_PIN") {
        await recordFailure(keys);
        await alertOnGlobalFailures();
        return fail("PIN inválido.", 401);
      }
      return fail("Não foi possível realizar este registro.", 422);
    }
    logger.error("kiosk.error", error, { ip, device: device.id });
    return fail("Não foi possível registrar o ponto. Tente novamente.", 500);
  }
}
