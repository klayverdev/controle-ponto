import { prisma, type Db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { MONTH_NAMES } from "@/lib/timezone";
import * as closings from "../repositories/closing-repository";
import { writeAudit } from "../repositories/audit-repository";

export type Actor = { userId: string; ip: string; userAgent: string };

export async function assertMonthOpen(db: Db, year: number, month: number) {
  if (await closings.isClosed(db, year, month)) {
    throw new UserError(`${MONTH_NAMES[month - 1]}/${year} está fechado.`);
  }
}

export async function closeMonth(year: number, month: number, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const before = await closings.find(tx, year, month);
    if (before?.status === "CLOSED") throw new UserError("Mês já está fechado.");
    const after = await closings.close(tx, year, month, actor.userId);
    await writeAudit(tx, {
      ...actor,
      userId: actor.userId,
      action: "CLOSE_MONTH",
      entity: "MonthlyClosing",
      entityId: after.id,
      before: before && { status: before.status },
      after: { year, month, status: after.status },
    });
  });
}

export async function reopenMonth(year: number, month: number, reason: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const before = await closings.find(tx, year, month);
    if (before?.status !== "CLOSED") throw new UserError("Mês não está fechado.");
    const after = await closings.reopen(tx, year, month, actor.userId, reason);
    await writeAudit(tx, {
      ...actor,
      action: "REOPEN_MONTH",
      entity: "MonthlyClosing",
      entityId: after.id,
      before: { status: before.status },
      after: { year, month, status: after.status },
      reason,
    });
  });
}
