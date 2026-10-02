import type { Db } from "@/lib/db";

export const find = (db: Db, year: number, month: number) => db.monthlyClosing.findUnique({ where: { year_month: { year, month } } });

export const isClosed = async (db: Db, year: number, month: number) => (await find(db, year, month))?.status === "CLOSED";

export const list = (db: Db) => db.monthlyClosing.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] });

export const close = (db: Db, year: number, month: number, userId: string) =>
  db.monthlyClosing.upsert({
    where: { year_month: { year, month } },
    create: { year, month, status: "CLOSED", closedBy: userId, closedAt: new Date() },
    update: { status: "CLOSED", closedBy: userId, closedAt: new Date(), reopenedBy: null, reopenedAt: null, reopenReason: null },
  });

export const reopen = (db: Db, year: number, month: number, userId: string, reason: string) =>
  db.monthlyClosing.update({
    where: { year_month: { year, month } },
    data: { status: "REOPENED", reopenedBy: userId, reopenedAt: new Date(), reopenReason: reason },
  });
