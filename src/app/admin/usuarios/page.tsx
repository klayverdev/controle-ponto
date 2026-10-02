import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input, Select, Table, Td } from "@/components/ui/form";
import { changeRoleAction, createUserAction, toggleUserAction } from "@/features/users/actions";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import * as users from "@/server/repositories/user-repository";

const roleOptions = (
  <>
    <option value="SUPERVISOR">Supervisor</option>
    <option value="ADMIN">Administrador</option>
  </>
);

export default async function UsersPage() {
  const { user } = await requireUser("users:manage");
  const list = await users.list(prisma);
  return (
    <>
      <PageTitle title="Usuários" subtitle="Administradores e supervisores" />
      <Card title="Novo usuário">
        <ActionForm action={createUserAction}>
          <Csrf />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Usuário"><Input name="username" required /></Field>
            <Field label="Perfil"><Select name="role">{roleOptions}</Select></Field>
          </div>
          <SubmitButton>Criar (gera senha temporária)</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Usuários">
        <Table head={["Usuário", "Perfil", "MFA", "Status", "Ações"]}>
          {list.map((u) => (
            <tr key={u.id}>
              <Td>{u.username}</Td>
              <Td>{u.role}</Td>
              <Td><Badge tone={u.mfaEnabled ? "green" : "amber"}>{u.mfaEnabled ? "Ativo" : "Pendente"}</Badge></Td>
              <Td><Badge tone={u.active ? "green" : "slate"}>{u.active ? "Ativo" : "Inativo"}</Badge></Td>
              <Td>
                {u.id !== user.id && (
                  <div className="flex flex-col gap-2">
                    <ActionForm action={changeRoleAction}>
                      <Csrf /><input type="hidden" name="id" value={u.id} />
                      <Select name="role" defaultValue={u.role}>{roleOptions}</Select>
                      <SubmitButton variant="outline">Alterar perfil</SubmitButton>
                    </ActionForm>
                    <ActionForm action={toggleUserAction}>
                      <Csrf /><input type="hidden" name="id" value={u.id} />
                      <SubmitButton variant={u.active ? "danger" : "outline"}>{u.active ? "Desativar" : "Ativar"}</SubmitButton>
                    </ActionForm>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
