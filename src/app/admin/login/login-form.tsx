"use client";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card, Field, Input } from "@/components/ui/form";
import { loginAction } from "@/features/auth/actions";

export function LoginForm() {
  return (
    <Card className="p-6 shadow-lg">
      <ActionForm action={loginAction}>
        <Field label="Usuário"><Input name="username" autoComplete="username" required /></Field>
        <Field label="Senha"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Field label="Código MFA ou de recuperação">
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" />
        </Field>
        <SubmitButton>Entrar</SubmitButton>
      </ActionForm>
    </Card>
  );
}
