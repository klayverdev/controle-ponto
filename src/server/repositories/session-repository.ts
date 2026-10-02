import type { Db } from "@/lib/db";

export const create = (db: Db, data: { id: string; userId: string; csrfToken: string; expiresAt: Date }) =>
  db.session.create({ data });

export const find = (db: Db, id: string) => db.session.findUnique({ where: { id }, include: { user: true } });

export const touch = (db: Db, id: string) => db.session.update({ where: { id }, data: { lastSeenAt: new Date() } });

export const remove = (db: Db, id: string) => db.session.deleteMany({ where: { id } });

export const removeOthers = (db: Db, userId: string, keepId: string) =>
  db.session.deleteMany({ where: { userId, id: { not: keepId } } });

export const removeAllOf = (db: Db, userId: string) => db.session.deleteMany({ where: { userId } });

export const purgeExpired = (db: Db) => db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
