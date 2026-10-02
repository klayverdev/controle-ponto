import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/page-title";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input, Table, Td } from "@/components/ui/form";
import { createDeviceAction, revokeDeviceAction } from "@/features/devices/actions";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import * as devices from "@/server/repositories/device-repository";

export default async function DevicesPage() {
  await requireUser("devices:manage");
  const list = await devices.list(prisma);
  return (
    <>
      <PageTitle title="Terminais" subtitle="Dispositivos autorizados a registrar ponto" />
      <Card title="Novo terminal">
        <ActionForm action={createDeviceAction}>
          <Csrf />
          <Field label="Nome"><Input name="name" required /></Field>
          <SubmitButton>Criar</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Terminais">
        <Table head={["Nome", "Criado em", "Status", "Ações"]}>
          {list.map((d) => (
            <tr key={d.id}>
              <Td>{d.name}</Td>
              <Td>{d.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</Td>
              <Td><Badge tone={d.active ? "green" : "red"}>{d.active ? "Ativo" : "Revogado"}</Badge></Td>
              <Td>
                {d.active && (
                  <ActionForm action={revokeDeviceAction}>
                    <Csrf /><input type="hidden" name="id" value={d.id} />
                    <SubmitButton variant="danger">Revogar</SubmitButton>
                  </ActionForm>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
