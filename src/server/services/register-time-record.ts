import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { burnVerification, pinLookup, verifySecret } from "@/lib/security";
import { formatDateBr, monthOf, toLocal } from "@/lib/timezone";
import * as employees from "../repositories/employee-repository";
import * as records from "../repositories/time-record-repository";
import { assertMonthOpen } from "./monthly-closing";
import { recalculateAround } from "./calculate-daily-summary";

export type ClockReason = "not_found" | "mismatch" | "inactive" | "interval" | "month_closed" | "internal";

export class ClockError extends Error {
  constructor(
    readonly kind: "INVALID_PIN" | "BLOCKED" | "INTERNAL",
    readonly reason: ClockReason,
  ) {
    super(reason);
  }
}

export type ClockInput = { pin: string; employeeCode?: string | undefined; deviceId: string };

export type ClockResult = {
  employeeName: string;
  type: "ENTRY" | "EXIT";
  date: string;
  time: string;
  message: string;
};

async function authenticate(input: ClockInput) {
  const candidate = env.KIOSK_REQUIRE_EMPLOYEE_CODE
    ? input.employeeCode ? await employees.findByCode(prisma, input.employeeCode) : null
    : await employees.findByPinLookup(prisma, pinLookup(input.pin));

  const valid = candidate?.pinHash ? await verifySecret(candidate.pinHash, input.pin) : (await burnVerification(input.pin), false);
  if (!candidate || !valid) throw new ClockError("INVALID_PIN", candidate ? "mismatch" : "not_found");
  if (!candidate.active) throw new ClockError("INVALID_PIN", "inactive");
  return candidate;
}

export async function registerTimeRecord(input: ClockInput): Promise<ClockResult> {
  const employee = await authenticate(input);

  return prisma.$transaction(async (tx) => {
    await records.lockEmployee(tx, employee.id);

    const now = new Date();
    const last = await records.lastValid(tx, employee.id);
    const type = last?.type === "ENTRY" ? "EXIT" : "ENTRY";

    if (last && now.getTime() - last.recordedAt.getTime() < env.KIOSK_MIN_INTERVAL_SECONDS * 1000) {
      throw new ClockError("BLOCKED", "interval");
    }

    const local = toLocal(now);
    const { year, month } = monthOf(local.date);
    await assertMonthOpen(tx, year, month).catch(() => {
      throw new ClockError("BLOCKED", "month_closed");
    });

    await records.insertRecord(tx, {
      employeeId: employee.id,
      recordedAt: now,
      type,
      source: "KIOSK",
      deviceId: input.deviceId,
    });
    await recalculateAround(tx, employee.id, [now]);

    return {
      employeeName: employee.fullName,
      type,
      date: formatDateBr(local.date),
      time: local.time,
      message: type === "ENTRY" ? "Entrada registrada com sucesso." : "Saída registrada com sucesso.",
    };
  });
}
