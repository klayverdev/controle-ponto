import { DayBadge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import { Card, Table, Td } from "@/components/ui/form";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { countSince } from "@/lib/rate-limit";
import { formatMinutes, hhmm, monthOf, monthRange, toLocal } from "@/lib/timezone";
import { recentAlerts } from "@/server/repositories/audit-repository";
import * as employees from "@/server/repositories/employee-repository";
import * as summaries from "@/server/repositories/summary-repository";
import * as records from "@/server/repositories/time-record-repository";
import { computeDay } from "@/server/services/calculate-daily-summary";

export default async function DashboardPage() {
  await requireUser("dashboard:view");
  const today = toLocal(new Date()).date;
  const { year, month } = monthOf(today);
  const { from, to } = monthRange(year, month);

  const [active, todays, overtime, failures, alerts] = await Promise.all([
    employees.listActive(prisma),
    records.listToday(prisma, today),
    summaries.monthOvertime(prisma, from, to),
    countSince("fail:", 86400),
    recentAlerts(prisma),
  ]);

  const rows = active.map((e) => {
    const own = todays.filter((r) => r.employeeId === e.id);
    const day = computeDay({ records: own, schedule: e.workSchedule, date: today, today });
    return { e, day, present: own.at(-1)?.type === "ENTRY" };
  });
  const present = rows.filter((r) => r.present).length;

  const stats = [
    ["Funcionários ativos", active.length],
    ["Presentes", present],
    ["Ausentes", active.length - present],
    ["Registros hoje", todays.length],
    ["Horas extras no mês", formatMinutes(overtime)],
  ];

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Visão geral de hoje" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label} className="border-l-4 border-l-teal-500">
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      {(failures > 0 || alerts.length > 0) && (
        <Card title="Segurança" className="border-amber-300">
          <p className="text-sm">Falhas de autenticação nas últimas 24h: <strong>{failures}</strong></p>
          {alerts.map((a) => (
            <p key={a.id} className="text-sm text-amber-800">
              {a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} — {a.reason}
            </p>
          ))}
        </Card>
      )}

      <Card title="Hoje">
        <Table head={["Funcionário", "Entrada", "Saída", "Horas trabalhadas", "Hora extra", "Status"]}>
          {rows.map(({ e, day }) => (
            <tr key={e.id}>
              <Td>{e.fullName}</Td>
              <Td>{hhmm(day.firstEntry)}</Td>
              <Td>{hhmm(day.lastExit)}</Td>
              <Td>{formatMinutes(day.workedMinutes)}</Td>
              <Td>{formatMinutes(day.overtimeMinutes)}</Td>
              <Td><DayBadge status={day.status} /></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
