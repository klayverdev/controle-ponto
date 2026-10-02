import { requireUser } from "@/lib/auth/guard";

export async function Csrf({ allowSetup = false }: { allowSetup?: boolean }) {
  const { session } = await requireUser(undefined, { allowSetup });
  return <input type="hidden" name="csrf" value={session.csrfToken} />;
}
