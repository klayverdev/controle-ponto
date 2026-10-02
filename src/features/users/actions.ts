"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAction } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { generatePassword, hashSecret } from "@/lib/security";
import { writeAudit } from "@/server/repositories/audit-repository";
import * as sessions from "@/server/repositories/session-repository";
import * as users from "@/server/repositories/user-repository";
import { run, ok, type ActionState } from "../action";

const role = z.enum(["ADMIN", "SUPERVISOR"]);

export async function createUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "users:manage");
    const input = z
      .object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, "Usuário inválido."), role })
      .parse(Object.fromEntries(fd));
    if (await users.findByUsername(prisma, input.username)) throw new UserError("Usuário já existe.");
    const password = generatePassword();
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...input, passwordHash: await hashSecret(password) } });
      await writeAudit(tx, { ...actor, action: "CREATE_USER", entity: "User", entityId: user.id, after: input });
    });
    revalidatePath("/admin/usuarios");
    return ok("Usuário criado. A senha temporária não será exibida novamente.", { secret: password });
  });
}

export async function changeRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "users:manage");
    const input = z.object({ id: z.string().uuid(), role }).parse(Object.fromEntries(fd));
    if (input.id === actor.userId) throw new UserError("Você não pode alterar o próprio perfil.");
    await prisma.$transaction(async (tx) => {
      const before = await users.findById(tx, input.id);
      if (!before) throw new UserError("Usuário não encontrado.");
      await tx.user.update({ where: { id: input.id }, data: { role: input.role } });
      await sessions.removeAllOf(tx, input.id);
      await writeAudit(tx, { ...actor, action: "CHANGE_ROLE", entity: "User", entityId: input.id, before: { role: before.role }, after: { role: input.role } });
    });
    revalidatePath("/admin/usuarios");
    return ok("Perfil atualizado.");
  });
}

export async function toggleUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "users:manage");
    const id = z.string().uuid().parse(fd.get("id"));
    if (id === actor.userId) throw new UserError("Você não pode desativar a si mesmo.");
    await prisma.$transaction(async (tx) => {
      const before = await users.findById(tx, id);
      if (!before) throw new UserError("Usuário não encontrado.");
      await tx.user.update({ where: { id }, data: { active: !before.active } });
      if (before.active) await sessions.removeAllOf(tx, id);
      await writeAudit(tx, { ...actor, action: "UPDATE_USER", entity: "User", entityId: id, before: { active: before.active }, after: { active: !before.active } });
    });
    revalidatePath("/admin/usuarios");
    return ok("Usuário atualizado.");
  });
}
