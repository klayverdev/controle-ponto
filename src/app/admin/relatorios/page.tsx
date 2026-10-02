import { PageTitle } from "@/components/ui/page-title";
import { Card, Field, Input, Select } from "@/components/ui/form";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { MONTH_NAMES, monthOf, toLocal } from "@/lib/timezone";
import * as employees from "@/server/repositories/employee-repository";

const link = "rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700";

export default async function ReportsPage() {
  await requireUser("reports:read");
  const { year, month } = monthOf(toLocal(new Date()).date);
  const list = await employees.listAll(prisma);

  const periodFields = (
    <>
      <PageTitle title="Relatórios" subtitle="Folha de ponto individual e relatório geral" />
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
      <Card title="Folha de ponto individual (PDF)">
        <form action="/api/admin/reports/individual" className="flex flex-wrap items-end gap-3">
          <Field label="Funcionário">
            <Select name="employeeId" required>
              {list.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </Select>
          </Field>
          {periodFields}
          <button className={link}>Gerar PDF</button>
        </form>
      </Card>

      <Card title="Relatório geral mensal">
        <form action="/api/admin/reports/general" className="flex flex-wrap items-end gap-3">
          {periodFields}
          <button name="format" value="pdf" className={link}>PDF</button>
          <button name="format" value="csv" className={link}>CSV</button>
        </form>
      </Card>
    </>
  );
}
