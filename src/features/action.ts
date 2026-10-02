import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import { UserError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ActionState = { ok: boolean; message?: string; secret?: string; extra?: string[] } | null;

export async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof UserError) return { ok: false, message: error.message };
    if (error instanceof ZodError) return { ok: false, message: error.issues[0]?.message ?? "Dados inválidos." };
    logger.error("action.failed", error);
    return { ok: false, message: "Não foi possível concluir a operação." };
  }
}

export const ok = (message: string, extra?: Partial<NonNullable<ActionState>>): ActionState => ({ ok: true, message, ...extra });
