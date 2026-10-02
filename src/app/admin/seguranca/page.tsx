import { PageTitle } from "@/components/ui/page-title";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Csrf } from "@/components/admin/csrf";
import { Card, Field, Input } from "@/components/ui/form";
import { changePasswordAction, enableMfaAction, startMfaAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth/guard";

export default async function SecurityPage() {
  const { user } = await requireUser(undefined, { allowSetup: true });
  return (
    <>
      <PageTitle title="Segurança" subtitle="Senha e autenticação em dois fatores" />
      {(user.mustChangePassword || (user.role === "ADMIN" && !user.mfaEnabled)) && (
        <p className="rounded-md bg-amber-100 p-3 text-sm">
          Conclua a troca de senha e a ativação do MFA para acessar o painel.
        </p>
      )}
      <Card title="Alterar senha">
        <ActionForm action={changePasswordAction} className="max-w-sm">
          <Csrf allowSetup />
          <Field label="Senha atual"><Input name="current" type="password" autoComplete="current-password" required /></Field>
          <Field label="Nova senha (mín. 12 caracteres)"><Input name="next" type="password" autoComplete="new-password" minLength={12} required /></Field>
          <Field label="Confirmar nova senha"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
          <SubmitButton>Alterar senha</SubmitButton>
        </ActionForm>
      </Card>
      {user.mfaEnabled ? (
        <Card title="Autenticação em dois fatores"><p className="text-sm">MFA ativo.</p></Card>
      ) : (
        <Card title="Ativar autenticação em dois fatores">
          <div className="flex flex-col gap-4">
            <ActionForm action={startMfaAction}>
              <Csrf allowSetup />
              <SubmitButton variant="outline">Gerar QR Code</SubmitButton>
            </ActionForm>
            <ActionForm action={enableMfaAction} className="max-w-sm">
              <Csrf allowSetup />
              <Field label="Código do aplicativo autenticador"><Input name="code" inputMode="numeric" autoComplete="one-time-code" required /></Field>
              <SubmitButton>Confirmar e ativar</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      )}
    </>
  );
}
