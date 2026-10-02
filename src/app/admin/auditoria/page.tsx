import { PageTitle } from "@/components/ui/page-title";
import { Card, Field, Input, Table, Td } from "@/components/ui/form";
import { SubmitButton } from "@/components/admin/action-form";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { fromLocal } from "@/lib/timezone";
import { listAudit } from "@/server/repositories/audit-repository";

type Params = { action?: string; entity?: string; from?: string; to?: string };

const date = (v: string | undefined, end: boolean) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fromLocal(v, end ? "23:59:59" : "00:00:00") : undefined;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireUser("audit:read");
  const q = await searchParams;
  const logs = await listAudit(prisma, {
    action: q.action?.trim() || undefined,
    entity: q.entity?.trim() || undefined,
    from: date(q.from, false),
    to: date(q.to, true),
  });

  return (
    <>
      <PageTitle title="Auditoria" subtitle="Histórico imutável das ações administrativas" />
      <Card title="Filtros">
        <form className="flex flex-wrap items-end gap-3">
          <Field label="Ação"><Input name="action" defaultValue={q.action} placeholder="RESET_PIN" /></Field>
          <Field label="Entidade"><Input name="entity" defaultValue={q.entity} placeholder="Employee" /></Field>
          <Field label="De"><Input name="from" type="date" defaultValue={q.from} /></Field>
          <Field label="Até"><Input name="to" type="date" defaultValue={q.to} /></Field>
          <SubmitButton>Filtrar</SubmitButton>
        </form>
      </Card>
      <Card title="Auditoria">
        <Table head={["Data", "Usuário", "Ação", "Entidade", "Anterior", "Novo", "Motivo"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <Td>{l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Td>
              <Td>{l.user?.username ?? "—"}</Td>
              <Td>{l.action}</Td>
              <Td>{l.entity}</Td>
              <Td><code className="break-all text-xs">{l.before ? JSON.stringify(l.before) : ""}</code></Td>
              <Td><code className="break-all text-xs">{l.after ? JSON.stringify(l.after) : ""}</code></Td>
              <Td>{l.reason}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
