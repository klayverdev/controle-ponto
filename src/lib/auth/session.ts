import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security";
import * as sessions from "@/server/repositories/session-repository";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  expires,
});

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + env.SESSION_ABSOLUTE_HOURS * 3600_000);
  await sessions.create(prisma, { id: sha256(token), userId, csrfToken: randomToken(), expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  if (Math.random() < 0.05) await sessions.purgeExpired(prisma);
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await sessions.find(prisma, sha256(token));
  if (!session) return null;

  const now = Date.now();
  const idle = now - session.lastSeenAt.getTime() > env.SESSION_IDLE_MINUTES * 60_000;
  if (idle || session.expiresAt.getTime() <= now || !session.user.active) {
    await sessions.remove(prisma, session.id);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60_000) await sessions.touch(prisma, session.id);
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sessions.remove(prisma, sha256(token));
  jar.set(SESSION_COOKIE, "", cookieOptions(new Date(0)));
}
