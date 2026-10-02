import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { can, type Permission } from "@/lib/permissions";
import { Csrf } from "./csrf";
import { NavLinks } from "./nav-links";

const ITEMS: { href: string; label: string; permission: Permission }[] = [
  { href: "/admin/dashboard", label: "Dashboard", permission: "dashboard:view" },
  { href: "/admin/funcionarios", label: "Funcionários", permission: "employees:read" },
  { href: "/admin/ponto", label: "Ponto", permission: "records:read" },
  { href: "/admin/relatorios", label: "Relatórios", permission: "reports:read" },
  { href: "/admin/fechamento", label: "Fechamento", permission: "dashboard:view" },
  { href: "/admin/auditoria", label: "Auditoria", permission: "audit:read" },
  { href: "/admin/terminais", label: "Terminais", permission: "devices:manage" },
  { href: "/admin/usuarios", label: "Usuários", permission: "users:manage" },
];

export function AdminNav({ role, username, setup }: { role: Role; username: string; setup: boolean }) {
  const items = [
    ...(setup ? [] : ITEMS.filter((i) => can(role, i.permission))),
    { href: "/admin/seguranca", label: "Segurança" },
  ];

  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-slate-900 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64">
      <div className="flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-400 font-bold text-slate-900">P</span>
        <span className="font-semibold text-white">Controle de Ponto</span>
      </div>
      <NavLinks items={items} />
      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4 lg:mt-auto">
        <span className="truncate text-sm text-slate-400">{username}</span>
        <form action={logoutAction}>
          <Csrf allowSetup />
          <Button variant="ghost" type="submit">Sair</Button>
        </form>
      </div>
    </aside>
  );
}
