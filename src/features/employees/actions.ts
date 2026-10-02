"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAction } from "@/lib/auth/guard";
import { UserError } from "@/lib/errors";
import * as service from "@/server/services/employees";
import { run, ok, type ActionState } from "../action";

const employeeSchema = z.object({
  employeeCode: z.string().trim().regex(/^[A-Za-z0-9-]{1,32}$/, "Matrícula inválida."),
  fullName: z.string().trim().min(3, "Nome muito curto.").max(120),
  positionId: z.string().uuid("Selecione o cargo."),
  departmentId: z.string().uuid("Selecione o setor."),
  workScheduleId: z.string().uuid("Selecione a jornada."),
});

const PIN_MESSAGE = "PIN gerado. Informe ao funcionário; não será exibido novamente.";

export async function createEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "employees:write");
    const { pin } = await service.createEmployee(employeeSchema.parse(Object.fromEntries(fd)), actor);
    revalidatePath("/admin/funcionarios");
    return ok(PIN_MESSAGE, { secret: pin });
  });
}

export async function updateEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "employees:write");
    const id = z.string().uuid().parse(fd.get("id"));
    await service.updateEmployee(id, employeeSchema.parse(Object.fromEntries(fd)), actor);
    revalidatePath("/admin/funcionarios");
    return ok("Funcionário atualizado.");
  });
}

export async function deactivateEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "employees:write");
    await service.deactivateEmployee(z.string().uuid().parse(fd.get("id")), actor);
    revalidatePath("/admin/funcionarios");
    return ok("Funcionário desativado.");
  });
}

export async function resetPinAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "pin:reset");
    const pin = await service.resetPin(z.string().uuid().parse(fd.get("id")), actor);
    revalidatePath("/admin/funcionarios");
    return ok(PIN_MESSAGE, { secret: pin });
  });
}

const catalogSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("position"), name: z.string().trim().min(2).max(80) }),
  z.object({ kind: z.literal("department"), name: z.string().trim().min(2).max(80) }),
  z.object({
    kind: z.literal("schedule"),
    name: z.string().trim().min(2).max(80),
    hours: z.coerce.number().min(1).max(24),
    breakMinutes: z.coerce.number().int().min(0).max(240),
    toleranceMinutes: z.coerce.number().int().min(0).max(60),
  }),
]);

export async function createCatalogAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { actor } = await authorizeAction(fd, "employees:write");
    const data = catalogSchema.parse(Object.fromEntries(fd));
    const days = fd.getAll("workDays").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (data.kind === "schedule" && days.length === 0) throw new UserError("Selecione ao menos um dia.");
    try {
      await service.createCatalog(
        data.kind === "schedule"
          ? { kind: "schedule", dailyMinutes: Math.round(data.hours * 60), breakMinutes: data.breakMinutes, toleranceMinutes: data.toleranceMinutes, workDays: days }
          : { kind: data.kind },
        data.name,
        actor,
      );
    } catch (e) {
      if (e instanceof Error && "code" in e && e.code === "P2002") throw new UserError("Nome já cadastrado.");
      throw e;
    }
    revalidatePath("/admin/funcionarios");
    return ok("Cadastro criado.");
  });
}
