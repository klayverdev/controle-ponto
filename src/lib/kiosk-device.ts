import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/security";
import * as devices from "@/server/repositories/device-repository";

export const DEVICE_COOKIE = process.env.NODE_ENV === "production" ? "__Host-kiosk_device" : "kiosk_device";

export async function currentDevice() {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  return token ? devices.findByTokenHash(prisma, sha256(token)) : null;
}
