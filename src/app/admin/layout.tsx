import { AdminNav } from "@/components/admin/nav";
import { needsSetup } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="min-h-screen lg:flex">
      {session && <AdminNav role={session.user.role} username={session.user.username} setup={needsSetup(session.user)} />}
      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
