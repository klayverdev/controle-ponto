import { Badge, DayBadge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input, Select, Table, Td } from "@/components/ui/form";
import { addRecordAction, cancelRecordAction, correctRecordAction } from "@/features/time-records/actions";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { MONTH_NAMES, formatDateBr, formatMinutes, hhmm, monthOf, monthRange, toLocal } from "@/lib/timezone";
import * as employees from "@/server/repositories/employee-repository";
import * as summaries from "@/server/repositories/summary-repository";
import * as records from "@/server/repositories/time-record-repository";

type Params = { employeeId?: string; year?: string; month?: string };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { user } = await requireUser("records:read");
  const q = await searchParams;
  const today = toLocal(new Date()).date;
  const current = monthOf(today);
  const year = Number(q.year) || current.year;
  const month = Number(q.month) || current.month;
  const list = await employees.listAll(prisma);
  const employee = list.find((e) => e.id === q.employeeId);
  const writable = can(user.role, "records:write");
  const { from, to } = monthRange(year, month);

  const [recs, days] = employee
    ? await Promise.all([records.listByRange(prisma, employee.id, from, to), summaries.byMonth(prisma, from, to, employee.id)])
    : [[], []];

  return (
    <>
      <PageTitle title="Registros de ponto" subtitle="Consulta, correção e lançamentos manuais" />
      <Card title="Consultar">
        <form className="flex flex-wrap items-end gap-3">
          <Field label="Funcionário">
            <Select name="employeeId" defaultValue={employee?.id} required>
              <option value="">Selecione</option>
              {list.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Mês">
            <Select name="month" defaultValue={month}>
              {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </Select>
          </Field>
          <Field label="Ano"><Input name="year" type="number" defaultValue={year} className="w-28" /></Field>
          <SubmitButton>Consultar</SubmitButton>
        </form>
      </Card>

      {employee && writable && (
        <Card title="Adicionar registro manual">
          <ActionForm action={addRecordAction}>
            <Csrf /><input type="hidden" name="employeeId" value={employee.id} />
            <div className="grid gap-3 md:grid-cols-5">
              <Field label="Data"><Input name="date" type="date" max={today} required /></Field>
              <Field label="Horário"><Input name="time" type="time" required /></Field>
              <Field label="Tipo">
                <Select name="type"><option value="ENTRY">Entrada</option><option value="EXIT">Saída</option></Select>
              </Field>
              <div className="md:col-span-2"><Field label="Motivo"><Input name="reason" minLength={10} required /></Field></div>
            </div>
            <SubmitButton>Adicionar</SubmitButton>
          </ActionForm>
        </Card>
      )}

      {employee && (
        <>
          <Card title="Resumo diário">
            <Table head={["Data", "Entrada", "Saída", "Trabalhado", "Previsto", "Extra", "Déficit", "Status"]}>
              {days.map((d) => (
                <tr key={d.id}>
                  <Td>{formatDateBr(d.date)}</Td>
                  <Td>{hhmm(d.firstEntry)}</Td>
                  <Td>{hhmm(d.lastExit)}</Td>
                  <Td>{formatMinutes(d.workedMinutes)}</Td>
                  <Td>{formatMinutes(d.expectedMinutes)}</Td>
                  <Td>{formatMinutes(d.overtimeMinutes)}</Td>
                  <Td>{formatMinutes(d.deficitMinutes)}</Td>
                  <Td><DayBadge status={d.status} /></Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Registros">
            <Table head={["Data", "Horário", "Tipo", "Origem", "Situação", "Ações"]}>
              {recs.map((r) => (
                <tr key={r.id} className={r.cancelledAt ? "text-slate-400 line-through" : undefined}>
                  <Td>{formatDateBr(r.recordDate)}</Td>
                  <Td>{r.recordTime}</Td>
                  <Td><Badge tone={r.type === "ENTRY" ? "green" : "sky"}>{r.type === "ENTRY" ? "Entrada" : "Saída"}</Badge></Td>
                  <Td>{r.source}</Td>
                  <Td>{r.cancelledAt ? <><Badge tone="red">Cancelado</Badge> <span className="text-xs">{r.cancelReason}</span></> : <Badge tone="green">Válido</Badge>}</Td>
                  <Td>
                    {writable && !r.cancelledAt && (
                      <div className="flex min-w-72 flex-col gap-2">
                        <ActionForm action={correctRecordAction}>
                          <Csrf /><input type="hidden" name="recordId" value={r.id} />
                          <div className="flex gap-1">
                            <Input name="date" type="date" defaultValue={r.recordDate} max={today} required />
                            <Input name="time" type="time" step={1} defaultValue={r.recordTime} required />
                          </div>
                          <Input name="reason" placeholder="Motivo da correção" minLength={10} required />
                          <SubmitButton variant="outline">Corrigir</SubmitButton>
                        </ActionForm>
                        <ActionForm action={cancelRecordAction}>
                          <Csrf /><input type="hidden" name="recordId" value={r.id} />
                          <Input name="reason" placeholder="Motivo do cancelamento" minLength={10} required />
                          <SubmitButton variant="danger">Cancelar registro</SubmitButton>
                        </ActionForm>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
