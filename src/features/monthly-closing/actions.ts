"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAction } from "@/lib/auth/guard";
import { closeMonth, reopenMonth } from "@/server/services/monthly-closing";
import { run, ok, type ActionState } from "../action";

const period = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
});

export async function closeMonthAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "closing:close");
    const { year, month } = period.parse(Object.fromEntries(fd));
    await closeMonth(year, month, actor);
    revalidatePath("/admin/fechamento");
    return ok("Mês fechado.");
  });
}

export async function reopenMonthAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "closing:reopen");
    const input = period
      .extend({ reason: z.string().trim().min(10, "Informe o motivo (mínimo 10 caracteres).").max(500) })
      .parse(Object.fromEntries(fd));
    await reopenMonth(input.year, input.month, input.reason, actor);
    revalidatePath("/admin/fechamento");
    return ok("Mês reaberto.");
  });
}
