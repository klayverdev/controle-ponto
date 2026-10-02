import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input, Select, Table, Td } from "@/components/ui/form";
import {
  createCatalogAction,
  createEmployeeAction,
  deactivateEmployeeAction,
  resetPinAction,
  updateEmployeeAction,
} from "@/features/employees/actions";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import * as repo from "@/server/repositories/employee-repository";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { user } = await requireUser("employees:read");
  const { edit } = await searchParams;
  const [list, cat] = await Promise.all([repo.listAll(prisma), repo.catalogs(prisma)]);
  const editing = list.find((e) => e.id === edit);
  const writable = can(user.role, "employees:write");
  const canReset = can(user.role, "pin:reset");

  const employeeFields = (e?: (typeof list)[number]) => (
    <div className="grid gap-3 md:grid-cols-5">
      <Field label="Matrícula"><Input name="employeeCode" defaultValue={e?.employeeCode} required /></Field>
      <Field label="Nome completo"><Input name="fullName" defaultValue={e?.fullName} required /></Field>
      <Field label="Cargo">
        <Select name="positionId" defaultValue={e?.positionId} required>
          {cat.positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Setor">
        <Select name="departmentId" defaultValue={e?.departmentId} required>
          {cat.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label="Jornada">
        <Select name="workScheduleId" defaultValue={e?.workScheduleId} required>
          {cat.schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
    </div>
  );

  return (
    <>
      <PageTitle title="Funcionários" subtitle="Cadastro, jornada e PIN" />
      {writable && (
        <Card title={editing ? `Editar ${editing.fullName}` : "Novo funcionário"}>
          <ActionForm action={editing ? updateEmployeeAction : createEmployeeAction} key={editing?.id ?? "new"}>
            <Csrf />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            {employeeFields(editing)}
            <div className="flex gap-2">
              <SubmitButton>{editing ? "Salvar" : "Cadastrar (gera PIN)"}</SubmitButton>
              {editing && <Link href="/admin/funcionarios" className="px-3 py-2 text-sm underline">Cancelar</Link>}
            </div>
          </ActionForm>
        </Card>
      )}

      <Card title="Funcionários">
        <Table head={["Nome", "Matrícula", "Cargo", "Setor", "Jornada", "Status", "Ações"]}>
          {list.map((e) => (
            <tr key={e.id}>
              <Td>{e.fullName}</Td>
              <Td>{e.employeeCode}</Td>
              <Td>{e.position.name}</Td>
              <Td>{e.department.name}</Td>
              <Td>{e.workSchedule.name}</Td>
              <Td><Badge tone={e.active ? "green" : "slate"}>{e.active ? "Ativo" : "Inativo"}</Badge></Td>
              <Td>
                <div className="flex flex-col gap-2">
                  {writable && <Link href={`/admin/funcionarios?edit=${e.id}`} className="underline">Editar</Link>}
                  {canReset && (
                    <ActionForm action={resetPinAction}>
                      <Csrf /><input type="hidden" name="id" value={e.id} />
                      <SubmitButton variant="outline">{e.active ? "Redefinir PIN" : "Reativar com novo PIN"}</SubmitButton>
                    </ActionForm>
                  )}
                  {writable && e.active && (
                    <ActionForm action={deactivateEmployeeAction}>
                      <Csrf /><input type="hidden" name="id" value={e.id} />
                      <SubmitButton variant="danger">Desativar</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {writable && (
        <div className="grid gap-4 md:grid-cols-3">
          {(["position", "department"] as const).map((kind) => (
            <Card key={kind} title={kind === "position" ? "Novo cargo" : "Novo setor"}>
              <ActionForm action={createCatalogAction}>
                <Csrf /><input type="hidden" name="kind" value={kind} />
                <Field label="Nome"><Input name="name" required /></Field>
                <SubmitButton>Cadastrar</SubmitButton>
              </ActionForm>
            </Card>
          ))}
          <Card title="Nova jornada">
            <ActionForm action={createCatalogAction}>
              <Csrf /><input type="hidden" name="kind" value="schedule" />
              <Field label="Nome"><Input name="name" required /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Horas/dia"><Input name="hours" type="number" step="0.25" defaultValue={8} required /></Field>
                <Field label="Intervalo (min)"><Input name="breakMinutes" type="number" defaultValue={60} required /></Field>
                <Field label="Tolerância (min)"><Input name="toleranceMinutes" type="number" defaultValue={10} required /></Field>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {DAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1">
                    <input type="checkbox" name="workDays" value={i} defaultChecked={i >= 1 && i <= 5} />{d}
                  </label>
                ))}
              </div>
              <SubmitButton>Cadastrar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
