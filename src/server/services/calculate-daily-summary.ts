import type { DayStatus, RecordType } from "@prisma/client";
import type { Db } from "@/lib/db";
import { toLocal, weekday } from "@/lib/timezone";
import { recordsForDay, neighborDates } from "../repositories/time-record-repository";

const BREAK_THRESHOLD_MINUTES = 360;

export type DayInput = {
  records: { type: RecordType; recordedAt: Date }[];
  schedule: { dailyMinutes: number; breakMinutes: number; toleranceMinutes: number; workDays: number[] };
  date: string;
  today: string;
};

export type DayResult = {
  firstEntry: string | null;
  lastExit: string | null;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  deficitMinutes: number;
  status: DayStatus;
};

export function computeDay({ records, schedule, date, today }: DayInput): DayResult {
  let open: Date | null = null;
  let consistent = true;
  let firstEntry: string | null = null;
  let lastExit: string | null = null;
  const pairs: number[] = [];

  for (const r of records) {
    if (r.type === "ENTRY") {
      if (open) consistent = false;
      open = r.recordedAt;
      firstEntry ??= toLocal(r.recordedAt).time;
    } else if (open) {
      pairs.push(Math.floor((r.recordedAt.getTime() - open.getTime()) / 60000));
      lastExit = toLocal(r.recordedAt).time;
      open = null;
    } else {
      consistent = false;
    }
  }

  let worked = pairs.reduce((a, b) => a + b, 0);
  if (pairs.length === 1 && worked >= BREAK_THRESHOLD_MINUTES) worked = Math.max(0, worked - schedule.breakMinutes);

  const expected = schedule.workDays.includes(weekday(date)) ? schedule.dailyMinutes : 0;
  const status: DayStatus = records.length === 0
    ? "ABSENT"
    : open
      ? date === today ? "OPEN" : "INCONSISTENT"
      : consistent ? "OK" : "INCONSISTENT";

  const diff = worked - expected;
  const settled = status === "OK";
  return {
    firstEntry,
    lastExit,
    workedMinutes: worked,
    expectedMinutes: expected,
    overtimeMinutes: settled && diff > schedule.toleranceMinutes ? diff : 0,
    deficitMinutes: settled && -diff > schedule.toleranceMinutes ? -diff : 0,
    status,
  };
}

export async function recalculateDay(db: Db, employeeId: string, date: string) {
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId }, include: { workSchedule: true } });
  const records = await recordsForDay(db, employeeId, date);
  if (records.length === 0) {
    await db.dailySummary.deleteMany({ where: { employeeId, date } });
    return;
  }
  const data = computeDay({ records, schedule: employee.workSchedule, date, today: toLocal(new Date()).date });
  await db.dailySummary.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: { employeeId, date, ...data },
    update: data,
  });
}

export async function recalculateAround(db: Db, employeeId: string, changed: Date[]) {
  const dates = new Set<string>();
  for (const at of changed) {
    dates.add(toLocal(at).date);
    for (const d of await neighborDates(db, employeeId, at)) dates.add(d);
  }
  for (const date of dates) await recalculateDay(db, employeeId, date);
}

export async function recalculateMonth(db: Db, employeeId: string, from: string, to: string) {
  const days = await db.timeRecord.findMany({
    where: { employeeId, recordDate: { gte: from, lte: to } },
    distinct: ["recordDate"],
    select: { recordDate: true },
  });
  for (const { recordDate } of days) await recalculateDay(db, employeeId, recordDate);
}
