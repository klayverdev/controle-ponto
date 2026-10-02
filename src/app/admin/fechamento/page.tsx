import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input, Select, Table, Td } from "@/components/ui/form";
import { closeMonthAction, reopenMonthAction } from "@/features/monthly-closing/actions";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { MONTH_NAMES, monthOf, toLocal } from "@/lib/timezone";
import * as closings from "@/server/repositories/closing-repository";

export default async function ClosingPage() {
  const { user } = await requireUser("dashboard:view");
  const { year, month } = monthOf(toLocal(new Date()).date);
  const list = await closings.list(prisma);
  const period = (
    <>
      <PageTitle title="Fechamento mensal" subtitle="Bloqueia novos registros e alterações no período" />
      <Field label="Mês">
        <Select name="month" defaultValue={month}>
          {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </Select>
      </Field>
      <Field label="Ano"><Input name="year" type="number" defaultValue={year} className="w-28" /></Field>
    </>
  );

  return (
    <>
      {can(user.role, "closing:close") && (
        <Card title="Fechar mês">
          <ActionForm action={closeMonthAction}>
            <Csrf />
            <div className="flex flex-wrap items-end gap-3">{period}<SubmitButton variant="danger">Fechar mês</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      {can(user.role, "closing:reopen") && (
        <Card title="Reabrir mês">
          <ActionForm action={reopenMonthAction}>
            <Csrf />
            <div className="flex flex-wrap items-end gap-3">
              {period}
              <Field label="Motivo"><Input name="reason" minLength={10} required /></Field>
              <SubmitButton variant="outline">Reabrir</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      )}
      <Card title="Períodos">
        <Table head={["Período", "Status", "Fechado em", "Reaberto em", "Motivo"]}>
          {list.map((c) => (
            <tr key={c.id}>
              <Td>{MONTH_NAMES[c.month - 1]}/{c.year}</Td>
              <Td><Badge tone={c.status === "CLOSED" ? "red" : "amber"}>{c.status === "CLOSED" ? "Fechado" : "Reaberto"}</Badge></Td>
              <Td>{c.closedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Td>
              <Td>{c.reopenedAt?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Td>
              <Td>{c.reopenReason}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
