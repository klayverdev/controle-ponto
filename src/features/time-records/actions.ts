"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAction } from "@/lib/auth/guard";
import { addManualRecord, cancelTimeRecord, correctRecord } from "@/server/services/admin-records";
import { run, ok, type ActionState } from "../action";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Horário inválido.");
const reason = z.string().trim().min(10, "Informe o motivo (mínimo 10 caracteres).").max(500);

export async function addRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "records:write");
    const input = z
      .object({ employeeId: z.string().uuid(), date, time, type: z.enum(["ENTRY", "EXIT"]), reason })
      .parse(Object.fromEntries(fd));
    await addManualRecord(input, actor);
    revalidatePath("/admin/ponto");
    return ok("Registro adicionado.");
  });
}

export async function correctRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "records:write");
    const input = z.object({ recordId: z.string().uuid(), date, time, reason }).parse(Object.fromEntries(fd));
    await correctRecord(input, actor);
    revalidatePath("/admin/ponto");
    return ok("Registro corrigido.");
  });
}

export async function cancelRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "records:write");
    const input = z.object({ recordId: z.string().uuid(), reason }).parse(Object.fromEntries(fd));
    await cancelTimeRecord(input, actor);
    revalidatePath("/admin/ponto");
    return ok("Registro cancelado.");
  });
}
