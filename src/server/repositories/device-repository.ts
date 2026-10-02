import type { Db } from "@/lib/db";

export const findByTokenHash = (db: Db, tokenHash: string) =>
  db.kioskDevice.findFirst({ where: { tokenHash, active: true } });

export const list = (db: Db) => db.kioskDevice.findMany({ orderBy: { createdAt: "desc" } });

export const create = (db: Db, name: string, tokenHash: string) => db.kioskDevice.create({ data: { name, tokenHash } });

export const revoke = (db: Db, id: string) =>
  db.kioskDevice.update({ where: { id }, data: { active: false, revokedAt: new Date() } });
