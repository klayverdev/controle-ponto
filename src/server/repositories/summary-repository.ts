import type { Db } from "@/lib/db";

export const byMonth = (db: Db, from: string, to: string, employeeId?: string) =>
  db.dailySummary.findMany({
    where: { date: { gte: from, lte: to }, ...(employeeId ? { employeeId } : {}) },
    orderBy: { date: "asc" },
  });

export const monthOvertime = async (db: Db, from: string, to: string) =>
  (await db.dailySummary.aggregate({ where: { date: { gte: from, lte: to } }, _sum: { overtimeMinutes: true } }))._sum
    .overtimeMinutes ?? 0;
