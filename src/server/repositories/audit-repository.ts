import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { redact } from "@/lib/logger";

export type AuditAction =
  | "CREATE_EMPLOYEE" | "UPDATE_EMPLOYEE" | "DEACTIVATE_EMPLOYEE" | "RESET_PIN"
  | "MANUAL_ENTRY" | "MANUAL_EXIT" | "UPDATE_TIME_RECORD" | "DELETE_TIME_RECORD"
  | "CLOSE_MONTH" | "REOPEN_MONTH" | "LOGIN_SUCCESS" | "LOGIN_FAILURE"
  | "CREATE_KIOSK_DEVICE" | "REVOKE_KIOSK_DEVICE" | "CREATE_USER" | "CHANGE_ROLE"
  | "GENERATE_REPORT" | "UPDATE_USER" | "CATALOG_CHANGE" | "CHANGE_PASSWORD" | "ENABLE_MFA" | "SECURITY_ALERT";

export type AuditInput = {
  userId?: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
};

const json = (value: unknown) => (value === undefined ? undefined : (redact(value) as Prisma.InputJsonValue));

export const writeAudit = (db: Db, input: AuditInput) =>
  db.auditLog.create({
    data: { ...input, userId: input.userId ?? null, before: json(input.before), after: json(input.after) },
  });

export type AuditFilter = { userId?: string; action?: string; entity?: string; from?: Date; to?: Date };

export const listAudit = (db: Db, f: AuditFilter, take = 200) =>
  db.auditLog.findMany({
    where: {
      userId: f.userId,
      action: f.action,
      entity: f.entity,
      createdAt: { gte: f.from, lte: f.to },
    },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

export const recentAlert = (db: Db, seconds: number) =>
  db.auditLog.count({ where: { action: "SECURITY_ALERT", createdAt: { gte: new Date(Date.now() - seconds * 1000) } } });

export const recentAlerts = (db: Db) =>
  db.auditLog.findMany({ where: { action: "SECURITY_ALERT" }, orderBy: { createdAt: "desc" }, take: 5 });
