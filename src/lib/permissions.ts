import type { Role } from "@prisma/client";
import { env } from "./env";

export type Permission =
  | "dashboard:view"
  | "employees:read"
  | "employees:write"
  | "pin:reset"
  | "records:read"
  | "records:write"
  | "reports:read"
  | "closing:close"
  | "closing:reopen"
  | "audit:read"
  | "users:manage"
  | "devices:manage";

const SUPERVISOR: Permission[] = ["dashboard:view", "employees:read", "records:read", "records:write", "reports:read"];

export function can(role: Role, permission: Permission) {
  if (role === "ADMIN") return true;
  if (permission === "closing:close") return env.SUPERVISOR_CAN_CLOSE;
  if (permission === "pin:reset") return env.SUPERVISOR_CAN_RESET_PIN;
  return SUPERVISOR.includes(permission);
}
