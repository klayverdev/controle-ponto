import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { can, type Permission } from "@/lib/permissions";
import { safeEqual } from "@/lib/security";
import { getSession } from "./session";

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return {
    ip: env.TRUST_PROXY && forwarded ? forwarded : "local",
    userAgent: (h.get("user-agent") ?? "").slice(0, 200),
  };
}

export const needsSetup = (u: { role: string; mustChangePassword: boolean; mfaEnabled: boolean }) =>
  u.mustChangePassword || (u.role === "ADMIN" && !u.mfaEnabled);

export async function requireUser(permission?: Permission, options: { allowSetup?: boolean } = {}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!options.allowSetup && needsSetup(session.user)) redirect("/admin/seguranca");
  if (permission && !can(session.user.role, permission)) redirect("/admin/dashboard");
  return { user: session.user, session, ...(await requestMeta()) };
}

export async function authorizeAction(formData: FormData, permission?: Permission, options: { allowSetup?: boolean } = {}) {
  const ctx = await requireUser(permission, options);
  if (!safeEqual(String(formData.get("csrf") ?? ""), ctx.session.csrfToken)) throw new Error("csrf");
  return { ...ctx, actor: { userId: ctx.user.id, ip: ctx.ip, userAgent: ctx.userAgent } };
}

export async function apiAuth(permission: Permission) {
  const session = await getSession();
  if (!session || needsSetup(session.user)) return { error: 401 as const };
  if (!can(session.user.role, permission)) return { error: 403 as const };
  return { ...(await requestMeta()), user: session.user };
}
