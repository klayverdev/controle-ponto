import type { RecordType } from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { formatDateBr, fromLocal, monthOf, toLocal } from "@/lib/timezone";
import * as records from "../repositories/time-record-repository";
import { writeAudit } from "../repositories/audit-repository";
import { recalculateAround } from "./calculate-daily-summary";
import { assertMonthOpen, type Actor } from "./monthly-closing";

const assertOpen = (db: Db, at: Date) => {
  const { year, month } = monthOf(toLocal(at).date);
  return assertMonthOpen(db, year, month);
};

const snapshot = (r: { recordedAt: Date; type: RecordType }) => ({ recordedAt: r.recordedAt, type: r.type });

export async function addManualRecord(
  input: { employeeId: string; date: string; time: string; type: RecordType; reason: string },
  actor: Actor,
) {
  const recordedAt = fromLocal(input.date, input.time);
  if (recordedAt.getTime() > Date.now()) throw new UserError("Não é possível registrar no futuro.");

  await prisma.$transaction(async (tx) => {
    await records.lockEmployee(tx, input.employeeId);
    await assertOpen(tx, recordedAt);
    const created = await records.insertRecord(tx, {
      employeeId: input.employeeId,
      recordedAt,
      type: input.type,
      source: "ADMIN",
      createdByUserId: actor.userId,
    });
    await recalculateAround(tx, input.employeeId, [recordedAt]);
    await writeAudit(tx, {
      ...actor,
      action: input.type === "ENTRY" ? "MANUAL_ENTRY" : "MANUAL_EXIT",
      entity: "TimeRecord",
      entityId: created.id,
      after: { ...snapshot(created), date: formatDateBr(input.date) },
      reason: input.reason,
    });
  });
}

export async function correctRecord(
  input: { recordId: string; date: string; time: string; reason: string },
  actor: Actor,
) {
  const recordedAt = fromLocal(input.date, input.time);
  if (recordedAt.getTime() > Date.now()) throw new UserError("Não é possível registrar no futuro.");

  await prisma.$transaction(async (tx) => {
    const old = await records.findRecord(tx, input.recordId);
    if (!old || old.cancelledAt) throw new UserError("Registro não encontrado.");
    await records.lockEmployee(tx, old.employeeId);
    await assertOpen(tx, old.recordedAt);
    await assertOpen(tx, recordedAt);
    await records.cancelRecord(tx, old.id, actor.userId, `Correção: ${input.reason}`);
    const created = await records.insertRecord(tx, {
      employeeId: old.employeeId,
      recordedAt,
      type: old.type,
      source: "ADMIN",
      createdByUserId: actor.userId,
    });
    await recalculateAround(tx, old.employeeId, [old.recordedAt, recordedAt]);
    await writeAudit(tx, {
      ...actor,
      action: "UPDATE_TIME_RECORD",
      entity: "TimeRecord",
      entityId: old.id,
      before: snapshot(old),
      after: { ...snapshot(created), replacementId: created.id },
      reason: input.reason,
    });
  });
}

export async function cancelTimeRecord(input: { recordId: string; reason: string }, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const old = await records.findRecord(tx, input.recordId);
    if (!old || old.cancelledAt) throw new UserError("Registro não encontrado.");
    await records.lockEmployee(tx, old.employeeId);
    await assertOpen(tx, old.recordedAt);
    await records.cancelRecord(tx, old.id, actor.userId, input.reason);
    await recalculateAround(tx, old.employeeId, [old.recordedAt]);
    await writeAudit(tx, {
      ...actor,
      action: "DELETE_TIME_RECORD",
      entity: "TimeRecord",
      entityId: old.id,
      before: snapshot(old),
      reason: input.reason,
    });
  });
}
