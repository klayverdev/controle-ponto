import type { Db } from "@/lib/db";

const include = { position: true, department: true, workSchedule: true } as const;

export const findByPinLookup = (db: Db, lookup: string) =>
  db.employee.findUnique({ where: { pinLookup: lookup }, include });

export const findByCode = (db: Db, code: string) => db.employee.findUnique({ where: { employeeCode: code }, include });

export const findById = (db: Db, id: string) => db.employee.findUnique({ where: { id }, include });

export const listAll = (db: Db) => db.employee.findMany({ orderBy: { fullName: "asc" }, include });

export const listActive = (db: Db) => db.employee.findMany({ where: { active: true }, orderBy: { fullName: "asc" }, include });

export const catalogs = async (db: Db) => {
  const [positions, departments, schedules] = await Promise.all([
    db.position.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.workSchedule.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { positions, departments, schedules };
};

export const pinExists = async (db: Db, lookup: string) =>
  (await db.employee.count({ where: { pinLookup: lookup } })) > 0;
