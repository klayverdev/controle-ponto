import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin/dashboard");
  return (
    <div className="grid min-h-[80vh] place-items-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-400 text-xl font-bold text-slate-900">P</span>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Ponto</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
