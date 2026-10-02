import { prisma } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { daysInMonth, formatMinutes, hhmm, monthRange, ymd } from "@/lib/timezone";
import * as employees from "../repositories/employee-repository";
import * as summaries from "../repositories/summary-repository";

export type Totals = { worked: number; overtime: number; expected: number; deficit: number };

export type IndividualReport = {
  year: number;
  month: number;
  employee: { fullName: string; employeeCode: string; position: string; department: string };
  rows: { day: string; entry: string; exit: string; overtime: string }[];
  totals: Totals;
};

export type GeneralReport = {
  year: number;
  month: number;
  rows: { name: string; department: string; days: number; worked: number; overtime: number; deficit: number }[];
};

export async function individualReport(employeeId: string, year: number, month: number): Promise<IndividualReport> {
  const employee = await employees.findById(prisma, employeeId);
  if (!employee) throw new UserError("Funcionário não encontrado.");
  const { from, to } = monthRange(year, month);
  const byDate = new Map((await summaries.byMonth(prisma, from, to, employeeId)).map((s) => [s.date, s]));
  const totals: Totals = { worked: 0, overtime: 0, expected: 0, deficit: 0 };

  const rows = Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const day = i + 1;
    const s = byDate.get(ymd(year, month, day));
    if (s) {
      totals.worked += s.workedMinutes;
      totals.overtime += s.overtimeMinutes;
      totals.expected += s.expectedMinutes;
      totals.deficit += s.deficitMinutes;
    }
    return {
      day: String(day).padStart(2, "0"),
      entry: hhmm(s?.firstEntry),
      exit: hhmm(s?.lastExit),
      overtime: s ? formatMinutes(s.overtimeMinutes) : "",
    };
  });

  return {
    year,
    month,
    employee: {
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
      position: employee.position.name,
      department: employee.department.name,
    },
    rows,
    totals,
  };
}

export async function generalReport(year: number, month: number): Promise<GeneralReport> {
  const { from, to } = monthRange(year, month);
  const [list, days] = await Promise.all([employees.listAll(prisma), summaries.byMonth(prisma, from, to)]);
  const rows = list.flatMap((e) => {
    const own = days.filter((d) => d.employeeId === e.id);
    if (!e.active && own.length === 0) return [];
    return [
      {
        name: e.fullName,
        department: e.department.name,
        days: own.filter((d) => d.workedMinutes > 0).length,
        worked: own.reduce((a, d) => a + d.workedMinutes, 0),
        overtime: own.reduce((a, d) => a + d.overtimeMinutes, 0),
        deficit: own.reduce((a, d) => a + d.deficitMinutes, 0),
      },
    ];
  });
  return { year, month, rows };
}
