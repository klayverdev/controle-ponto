import type { RecordSource, RecordType } from "@prisma/client";
import type { Db } from "@/lib/db";
import { chainHash } from "@/lib/security";
import { toLocal } from "@/lib/timezone";

export const lockEmployee = (db: Db, employeeId: string) =>
  db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${employeeId}, 0))`;

export const lastValid = (db: Db, employeeId: string) =>
  db.timeRecord.findFirst({ where: { employeeId, cancelledAt: null }, orderBy: { recordedAt: "desc" } });

const lastBefore = (db: Db, employeeId: string, at: Date) =>
  db.timeRecord.findFirst({
    where: { employeeId, cancelledAt: null, recordedAt: { lt: at } },
    orderBy: { recordedAt: "desc" },
  });

const firstAfter = (db: Db, employeeId: string, at: Date) =>
  db.timeRecord.findFirst({
    where: { employeeId, cancelledAt: null, recordedAt: { gt: at } },
    orderBy: { recordedAt: "asc" },
  });

export async function insertRecord(
  db: Db,
  data: { employeeId: string; recordedAt: Date; type: RecordType; source: RecordSource; deviceId?: string; createdByUserId?: string },
) {
  const previous = await db.timeRecord.findFirst({
    where: { employeeId: data.employeeId },
    orderBy: { seq: "desc" },
    select: { integrityHash: true },
  });
  const { date, time } = toLocal(data.recordedAt);
  return db.timeRecord.create({
    data: {
      ...data,
      recordDate: date,
      recordTime: time,
      integrityHash: chainHash(previous?.integrityHash ?? "GENESIS", data),
    },
  });
}

export const cancelRecord = (db: Db, id: string, userId: string, reason: string) =>
  db.timeRecord.update({ where: { id }, data: { cancelledAt: new Date(), cancelledByUserId: userId, cancelReason: reason } });

export const findRecord = (db: Db, id: string) => db.timeRecord.findUnique({ where: { id } });

export async function recordsForDay(db: Db, employeeId: string, date: string) {
  const day = await db.timeRecord.findMany({
    where: { employeeId, recordDate: date, cancelledAt: null },
    orderBy: { recordedAt: "asc" },
  });
  const first = day[0];
  if (first?.type === "EXIT") {
    const previous = await lastBefore(db, employeeId, first.recordedAt);
    if (previous?.type === "ENTRY" && previous.recordDate !== date) day.shift();
  }
  const last = day.at(-1);
  if (last?.type === "ENTRY") {
    const next = await firstAfter(db, employeeId, last.recordedAt);
    if (next?.type === "EXIT" && next.recordDate !== date) day.push(next);
  }
  return day;
}

export async function neighborDates(db: Db, employeeId: string, at: Date) {
  const [previous, next] = await Promise.all([lastBefore(db, employeeId, at), firstAfter(db, employeeId, at)]);
  return [previous?.recordDate, next?.recordDate].filter((d): d is string => Boolean(d));
}

export const listByRange = (db: Db, employeeId: string, from: string, to: string) =>
  db.timeRecord.findMany({
    where: { employeeId, recordDate: { gte: from, lte: to } },
    orderBy: { recordedAt: "asc" },
  });

export const listToday = (db: Db, date: string) =>
  db.timeRecord.findMany({ where: { recordDate: date, cancelledAt: null }, orderBy: { recordedAt: "asc" } });

export const countToday = (db: Db, date: string) => db.timeRecord.count({ where: { recordDate: date, cancelledAt: null } });
