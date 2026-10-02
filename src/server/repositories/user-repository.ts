import type { Db } from "@/lib/db";

export const findByUsername = (db: Db, username: string) => db.user.findUnique({ where: { username } });

export const findById = (db: Db, id: string) => db.user.findUnique({ where: { id } });

export const list = (db: Db) =>
  db.user.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, role: true, active: true, mfaEnabled: true, createdAt: true },
  });
