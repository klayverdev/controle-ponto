"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAction } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security";
import { writeAudit } from "@/server/repositories/audit-repository";
import * as devices from "@/server/repositories/device-repository";
import { run, ok, type ActionState } from "../action";

export async function createDeviceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "devices:manage");
    const name = z.string().trim().min(2, "Nome muito curto.").max(80).parse(fd.get("name"));
    const token = randomToken(32);
    await prisma.$transaction(async (tx) => {
      const device = await devices.create(tx, name, sha256(token));
      await writeAudit(tx, { ...actor, action: "CREATE_KIOSK_DEVICE", entity: "KioskDevice", entityId: device.id, after: { name } });
    });
    revalidatePath("/admin/terminais");
    return ok("Terminal criado. Ative-o em /ativar com o token abaixo; ele não será exibido novamente.", { secret: token });
  });
}

export async function revokeDeviceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "devices:manage");
    const id = z.string().uuid().parse(fd.get("id"));
    await prisma.$transaction(async (tx) => {
      await devices.revoke(tx, id);
      await writeAudit(tx, { ...actor, action: "REVOKE_KIOSK_DEVICE", entity: "KioskDevice", entityId: id });
    });
    revalidatePath("/admin/terminais");
    return ok("Terminal revogado.");
  });
}
