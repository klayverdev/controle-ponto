"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/features/action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: "primary" | "outline" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Aguarde…" : children}
    </Button>
  );
}

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const isImage = state?.message?.startsWith("data:image/");

  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      {children}
      {state?.message && !isImage && (
        <p role="status" className={cn("text-sm", state.ok ? "text-green-700" : "text-red-700")}>{state.message}</p>
      )}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state!.message} alt="QR Code MFA" width={180} height={180} />
      )}
      {state?.secret && <code className="select-all break-all rounded bg-amber-100 px-3 py-2 text-lg font-bold">{state.secret}</code>}
      {state?.extra && (
        <ul className="grid grid-cols-2 gap-1 rounded bg-amber-100 p-3 font-mono text-sm">
          {state.extra.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </form>
  );
}
