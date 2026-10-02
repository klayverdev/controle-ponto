import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashSecret, pinLookup } from "@/lib/security";
import { toLocal } from "@/lib/timezone";
import { addManualRecord, cancelTimeRecord, correctRecord } from "@/server/services/admin-records";
import { closeMonth, reopenMonth } from "@/server/services/monthly-closing";
import { ClockError, registerTimeRecord } from "@/server/services/register-time-record";
import { generalReport, individualReport } from "@/server/services/generate-report";
import { generalPdf, individualPdf } from "@/server/services/generate-pdf";

const PIN = "482913";
const OTHER = "175306";
let employeeId = "";
let otherId = "";
let deviceId = "";
let userId = "";
const actor = () => ({ userId, ip: "local", userAgent: "test" });

const clock = (pin = PIN) => registerTimeRecord({ pin, deviceId });
const backdate = async (id: string, ms = 120_000) => {
  await prisma.$executeRawUnsafe(`ALTER TABLE "TimeRecord" DISABLE TRIGGER USER`);
  try {
    await prisma.$executeRaw`UPDATE "TimeRecord" SET "recordedAt" = "recordedAt" - (${ms} * interval '1 millisecond') WHERE "employeeId" = ${id}::uuid`;
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TimeRecord" ENABLE TRIGGER USER`);
  }
};

async function wipe() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "TimeRecord" DISABLE TRIGGER USER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER USER`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE "AuditLog","TimeRecord","DailySummary","MonthlyClosing","Employee","KioskDevice","WorkSchedule","Position","Department","Session","User","RateLimitEvent" CASCADE`,
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "TimeRecord" ENABLE TRIGGER USER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER USER`);
}

beforeAll(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await wipe();
  const [position, department, schedule, device, user] = await Promise.all([
    prisma.position.create({ data: { name: "Atendente" } }),
    prisma.department.create({ data: { name: "Atendimento" } }),
    prisma.workSchedule.create({ data: { name: "8h", dailyMinutes: 480, breakMinutes: 60, toleranceMinutes: 10 } }),
    prisma.kioskDevice.create({ data: { name: "t", tokenHash: "h" } }),
    prisma.user.create({ data: { username: "admin", passwordHash: "x", role: "ADMIN" } }),
  ]);
  deviceId = device.id;
  userId = user.id;
  const base = { positionId: position.id, departmentId: department.id, workScheduleId: schedule.id };
  const make = async (employeeCode: string, fullName: string, pin: string, active = true) =>
    (await prisma.employee.create({
      data: { employeeCode, fullName, ...base, active, pinLookup: pinLookup(pin), pinHash: await hashSecret(pin) },
    })).id;
  employeeId = await make("001", "João Silva", PIN);
  otherId = await make("002", "Maria Souza", OTHER);
  await make("003", "Inativo", "360894", false);
});

describe("registerTimeRecord", () => {
  it("alterna entrada e saída e usa horário do servidor", async () => {
    const before = Date.now();
    const entry = await clock();
    expect(entry).toMatchObject({ employeeName: "João Silva", type: "ENTRY", message: "Entrada registrada com sucesso." });
    expect(entry.time).toBe(toLocal(new Date(before)).time.slice(0, 5) + entry.time.slice(5));

    await backdate(employeeId);
    const exit = await clock();
    expect(exit).toMatchObject({ type: "EXIT", message: "Saída registrada com sucesso." });
    expect(await prisma.timeRecord.count({ where: { employeeId, source: "KIOSK", deviceId } })).toBe(2);
  });

  it("não mistura funcionários", async () => {
    await clock();
    expect((await clock(OTHER)).type).toBe("ENTRY");
  });

  it("rejeita PIN inexistente e de funcionário inativo com o mesmo erro", async () => {
    for (const pin of ["999999", "360894"]) {
      await expect(clock(pin)).rejects.toMatchObject({ kind: "INVALID_PIN" });
    }
  });

  it("bloqueia registros em intervalo menor que o mínimo", async () => {
    await clock();
    await expect(clock()).rejects.toMatchObject({ kind: "BLOCKED", reason: "interval" });
  });

  it("aceita apenas um registro entre requisições concorrentes", async () => {
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => clock()));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.timeRecord.count({ where: { employeeId } })).toBe(1);
  });

  it("recalcula o resumo diário", async () => {
    await clock();
    const summary = await prisma.dailySummary.findFirstOrThrow({ where: { employeeId } });
    expect(summary.status).toBe("OPEN");
  });

  it("bloqueia mês fechado e permite após reabertura", async () => {
    const { year, month } = { year: Number(toLocal(new Date()).date.slice(0, 4)), month: Number(toLocal(new Date()).date.slice(5, 7)) };
    await closeMonth(year, month, actor());
    await expect(clock()).rejects.toMatchObject({ kind: "BLOCKED", reason: "month_closed" });
    await reopenMonth(year, month, "Reabertura para ajuste", actor());
    await expect(clock()).resolves.toMatchObject({ type: "ENTRY" });
  });

  it("lança ClockError tipado", async () => {
    await expect(clock("999999")).rejects.toBeInstanceOf(ClockError);
  });
});

describe("administração de registros", () => {
  const date = toLocal(new Date(Date.now() - 86_400_000)).date;

  it("adiciona, corrige e cancela com auditoria e cálculo", async () => {
    await addManualRecord({ employeeId, date, time: "08:00", type: "ENTRY", reason: "Esquecimento de registro" }, actor());
    await addManualRecord({ employeeId, date, time: "17:30", type: "EXIT", reason: "Esquecimento de registro" }, actor());
    let summary = await prisma.dailySummary.findFirstOrThrow({ where: { employeeId, date } });
    expect(summary).toMatchObject({ workedMinutes: 510, overtimeMinutes: 30, status: "OK" });

    const exit = await prisma.timeRecord.findFirstOrThrow({ where: { employeeId, type: "EXIT" } });
    await correctRecord({ recordId: exit.id, date, time: "18:00", reason: "Horário real informado" }, actor());
    summary = await prisma.dailySummary.findFirstOrThrow({ where: { employeeId, date } });
    expect(summary.overtimeMinutes).toBe(60);

    const entry = await prisma.timeRecord.findFirstOrThrow({ where: { employeeId, type: "ENTRY" } });
    await cancelTimeRecord({ recordId: entry.id, reason: "Registro lançado indevidamente" }, actor());
    expect((await prisma.dailySummary.findFirstOrThrow({ where: { employeeId, date } })).status).toBe("INCONSISTENT");

    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.action)).toEqual(["MANUAL_ENTRY", "MANUAL_EXIT", "UPDATE_TIME_RECORD", "DELETE_TIME_RECORD"]);
    const update = logs[2]!;
    expect(update.reason).toBe("Horário real informado");
    expect(update.before).toBeTruthy();
    expect(update.after).toBeTruthy();
  });

  it("bloqueia alterações em mês fechado", async () => {
    const [y, m] = date.split("-").map(Number) as [number, number];
    await closeMonth(y, m, actor());
    await expect(
      addManualRecord({ employeeId, date, time: "08:00", type: "ENTRY", reason: "Esquecimento de registro" }, actor()),
    ).rejects.toThrow(/fechado/);
  });

  it("impede alteração e exclusão diretas no banco", async () => {
    await addManualRecord({ employeeId, date, time: "08:00", type: "ENTRY", reason: "Esquecimento de registro" }, actor());
    await expect(prisma.timeRecord.deleteMany({})).rejects.toThrow();
    await expect(prisma.timeRecord.updateMany({ data: { type: "EXIT" } })).rejects.toThrow();
    await expect(prisma.auditLog.deleteMany({})).rejects.toThrow();
    await expect(prisma.auditLog.updateMany({ data: { reason: "x" } })).rejects.toThrow();
  });
});

describe("relatórios", () => {
  it("gera relatórios e PDFs com totais", async () => {
    const date = toLocal(new Date(Date.now() - 86_400_000)).date;
    await addManualRecord({ employeeId, date, time: "08:00", type: "ENTRY", reason: "Esquecimento de registro" }, actor());
    await addManualRecord({ employeeId, date, time: "17:30", type: "EXIT", reason: "Esquecimento de registro" }, actor());
    const [year, month] = date.split("-").map(Number) as [number, number];

    const individual = await individualReport(employeeId, year, month);
    expect(individual.totals).toMatchObject({ worked: 510, overtime: 30 });
    const pdf = await individualPdf(individual);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");

    const general = await generalReport(year, month);
    expect(general.rows.find((r) => r.name === "João Silva")).toMatchObject({ days: 1, worked: 510, overtime: 30 });
    expect(general.rows.some((r) => r.name === "Inativo")).toBe(false);
    expect((await generalPdf(general)).subarray(0, 4).toString()).toBe("%PDF");
    expect(otherId).toBeTruthy();
  });
});
