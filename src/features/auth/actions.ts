"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authorizeAction, requestMeta } from "@/lib/auth/guard";
import { mfaQr, mfaSecretText, newMfaSecret, newRecoveryCodes, verifyTotp } from "@/lib/auth/mfa";
import { createSession, destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { recordFailure, retryAfter } from "@/lib/rate-limit";
import { burnVerification, hashSecret, sha256, validatePassword, verifySecret } from "@/lib/security";
import { writeAudit } from "@/server/repositories/audit-repository";
import * as sessions from "@/server/repositories/session-repository";
import * as users from "@/server/repositories/user-repository";
import { run, ok, type ActionState } from "../action";

const INVALID = "Credenciais inválidas.";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
  code: z.string().trim().max(32).optional(),
});

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const meta = await requestMeta();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: INVALID };
  const { username, password, code = "" } = parsed.data;

  const keys = [`fail:login:ip:${meta.ip}`, `fail:login:user:${username.toLowerCase()}`];
  if ((await retryAfter(keys)) > 0) return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." };

  const user = await users.findByUsername(prisma, username.toLowerCase());
  const passwordOk = user?.active ? await verifySecret(user.passwordHash, password) : (await burnVerification(password), false);

  let secondFactor = true;
  let usedRecovery: string | null = null;
  if (user && passwordOk && user.mfaEnabled && user.mfaSecret) {
    const hash = sha256(code);
    usedRecovery = user.recoveryCodes.includes(hash) ? hash : null;
    secondFactor = verifyTotp(user.mfaSecret, code) || usedRecovery !== null;
  }

  if (!user || !passwordOk || !secondFactor) {
    await recordFailure(keys);
    await writeAudit(prisma, { ...meta, userId: user?.id ?? null, action: "LOGIN_FAILURE", entity: "User", entityId: user?.id, after: { username } });
    return { ok: false, message: INVALID };
  }

  if (usedRecovery) {
    await prisma.user.update({ where: { id: user.id }, data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== usedRecovery) } });
  }
  await createSession(user.id);
  await writeAudit(prisma, { ...meta, userId: user.id, action: "LOGIN_SUCCESS", entity: "User", entityId: user.id });
  redirect("/admin/dashboard");
}

export async function logoutAction(formData: FormData) {
  await authorizeAction(formData, undefined, { allowSetup: true });
  await destroySession();
  redirect("/admin/login");
}

const passwordSchema = z.object({
  current: z.string().min(1).max(128),
  next: z.string().min(1).max(128),
  confirm: z.string(),
});

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const { user, session, actor } = await authorizeAction(formData, undefined, { allowSetup: true });
    const { current, next, confirm } = passwordSchema.parse(Object.fromEntries(formData));
    if (!(await verifySecret(user.passwordHash, current))) throw new UserError("Senha atual incorreta.");
    if (next !== confirm) throw new UserError("A confirmação não confere.");
    if (next === current) throw new UserError("A nova senha deve ser diferente da atual.");
    const invalid = validatePassword(next, user.username);
    if (invalid) throw new UserError(invalid);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hashSecret(next), mustChangePassword: false } });
      await sessions.removeOthers(tx, user.id, session.id);
      await writeAudit(tx, { ...actor, action: "CHANGE_PASSWORD", entity: "User", entityId: user.id });
    });
    return ok("Senha alterada.");
  });
}

export async function startMfaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const { user } = await authorizeAction(formData, undefined, { allowSetup: true });
    if (user.mfaEnabled) throw new UserError("MFA já está ativo.");
    const secret = user.mfaSecret ?? newMfaSecret();
    if (!user.mfaSecret) await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    return ok(await mfaQr(secret, user.username), { secret: mfaSecretText(secret) });
  });
}

export async function enableMfaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const { user, actor } = await authorizeAction(formData, undefined, { allowSetup: true });
    const fresh = await users.findById(prisma, user.id);
    if (!fresh?.mfaSecret || fresh.mfaEnabled) throw new UserError("Inicie a configuração do MFA.");
    if (!verifyTotp(fresh.mfaSecret, String(formData.get("code") ?? "").trim())) throw new UserError("Código inválido.");

    const { plain, hashes } = newRecoveryCodes();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { mfaEnabled: true, recoveryCodes: hashes } });
      await writeAudit(tx, { ...actor, action: "ENABLE_MFA", entity: "User", entityId: user.id });
    });
    return ok("MFA ativado. Guarde os códigos de recuperação.", { extra: plain });
  });
}
