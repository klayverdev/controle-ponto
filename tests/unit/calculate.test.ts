import { describe, expect, it } from "vitest";
import { computeDay } from "@/server/services/calculate-daily-summary";
import { fromLocal } from "@/lib/timezone";

const schedule = { dailyMinutes: 480, breakMinutes: 60, toleranceMinutes: 10, workDays: [1, 2, 3, 4, 5] };
const at = (date: string, time: string, type: "ENTRY" | "EXIT") => ({ type, recordedAt: fromLocal(date, time) });
const run = (records: ReturnType<typeof at>[], date = "2026-09-30", today = "2026-10-01") =>
  computeDay({ records, schedule, date, today });

describe("computeDay", () => {
  it("calcula horas trabalhadas descontando o intervalo e hora extra", () => {
    const r = run([at("2026-09-30", "08:00:00", "ENTRY"), at("2026-09-30", "17:30:00", "EXIT")]);
    expect(r).toMatchObject({ workedMinutes: 510, overtimeMinutes: 30, deficitMinutes: 0, status: "OK" });
  });

  it("respeita a tolerância", () => {
    const r = run([at("2026-09-30", "08:00:00", "ENTRY"), at("2026-09-30", "17:05:00", "EXIT")]);
    expect(r.overtimeMinutes).toBe(0);
  });

  it("calcula déficit", () => {
    const r = run([at("2026-09-30", "08:00:00", "ENTRY"), at("2026-09-30", "16:00:00", "EXIT")]);
    expect(r).toMatchObject({ workedMinutes: 420, deficitMinutes: 60 });
  });

  it("soma múltiplos períodos sem descontar intervalo", () => {
    const r = run([
      at("2026-09-30", "08:00:00", "ENTRY"),
      at("2026-09-30", "12:00:00", "EXIT"),
      at("2026-09-30", "13:00:00", "ENTRY"),
      at("2026-09-30", "17:00:00", "EXIT"),
    ]);
    expect(r).toMatchObject({ workedMinutes: 480, overtimeMinutes: 0, status: "OK" });
  });

  it("marca dia aberto como OPEN hoje e INCONSISTENT depois", () => {
    const open = [at("2026-09-30", "08:00:00", "ENTRY")];
    expect(run(open, "2026-09-30", "2026-09-30").status).toBe("OPEN");
    expect(run(open).status).toBe("INCONSISTENT");
  });

  it("não calcula extra ou déficit em dia inconsistente", () => {
    const r = run([at("2026-09-30", "08:00:00", "ENTRY"), at("2026-09-30", "08:10:00", "ENTRY")]);
    expect(r).toMatchObject({ status: "INCONSISTENT", overtimeMinutes: 0, deficitMinutes: 0 });
  });

  it("trata fim de semana como hora extra integral", () => {
    const r = run([at("2026-09-26", "08:00:00", "ENTRY"), at("2026-09-26", "12:00:00", "EXIT")], "2026-09-26");
    expect(r).toMatchObject({ expectedMinutes: 0, overtimeMinutes: 240 });
  });

  it("suporta turno que cruza a meia-noite", () => {
    const r = run([at("2026-09-30", "22:00:00", "ENTRY"), at("2026-10-01", "06:00:00", "EXIT")]);
    expect(r).toMatchObject({ workedMinutes: 420, status: "OK" });
  });
});
