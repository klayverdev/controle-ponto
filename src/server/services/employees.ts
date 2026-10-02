import { prisma } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { generatePin, hashSecret, pinLookup } from "@/lib/security";
import { monthRange, monthOf, toLocal } from "@/lib/timezone";
import * as repo from "../repositories/employee-repository";
import { writeAudit } from "../repositories/audit-repository";
import { recalculateMonth } from "./calculate-daily-summary";
import type { Actor } from "./monthly-closing";

type EmployeeInput = {
  employeeCode: string;
  fullName: string;
  positionId: string;
  departmentId: string;
  workScheduleId: string;
};

async function issuePin() {
  for (let i = 0; i < 20; i++) {
    const pin = generatePin();
    const lookup = pinLookup(pin);
    if (!(await repo.pinExists(prisma, lookup))) return { pin, lookup, hash: await hashSecret(pin) };
  }
  throw new UserError("Não foi possível gerar um PIN único. Tente novamente.");
}

const view = (e: { employeeCode: string; fullName: string; positionId: string; departmentId: string; workScheduleId: string; active: boolean }) => ({
  employeeCode: e.employeeCode,
  fullName: e.fullName,
  positionId: e.positionId,
  departmentId: e.departmentId,
  workScheduleId: e.workScheduleId,
  active: e.active,
});

export async function createEmployee(input: EmployeeInput, actor: Actor) {
  const { pin, lookup, hash } = await issuePin();
  const created = await prisma.$transaction(async (tx) => {
    if (await tx.employee.findUnique({ where: { employeeCode: input.employeeCode } })) {
      throw new UserError("Matrícula já cadastrada.");
    }
    const employee = await tx.employee.create({ data: { ...input, pinLookup: lookup, pinHash: hash } });
    await writeAudit(tx, { ...actor, action: "CREATE_EMPLOYEE", entity: "Employee", entityId: employee.id, after: view(employee) });
    return employee;
  });
  return { id: created.id, pin };
}

export async function updateEmployee(id: string, input: EmployeeInput, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const before = await repo.findById(tx, id);
    if (!before) throw new UserError("Funcionário não encontrado.");
    const clash = await tx.employee.findUnique({ where: { employeeCode: input.employeeCode } });
    if (clash && clash.id !== id) throw new UserError("Matrícula já cadastrada.");
    const after = await tx.employee.update({ where: { id }, data: input });
    if (before.workScheduleId !== input.workScheduleId) {
      const { from, to } = monthRange(monthOf(toLocal(new Date()).date).year, monthOf(toLocal(new Date()).date).month);
      await recalculateMonth(tx, id, from, to);
    }
    await writeAudit(tx, { ...actor, action: "UPDATE_EMPLOYEE", entity: "Employee", entityId: id, before: view(before), after: view(after) });
  });
}

export async function deactivateEmployee(id: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const before = await repo.findById(tx, id);
    if (!before?.active) throw new UserError("Funcionário não encontrado ou já inativo.");
    await tx.employee.update({ where: { id }, data: { active: false, pinHash: null, pinLookup: null } });
    await writeAudit(tx, {
      ...actor,
      action: "DEACTIVATE_EMPLOYEE",
      entity: "Employee",
      entityId: id,
      before: { active: true },
      after: { active: false },
    });
  });
}

export async function resetPin(id: string, actor: Actor) {
  const { pin, lookup, hash } = await issuePin();
  await prisma.$transaction(async (tx) => {
    const before = await repo.findById(tx, id);
    if (!before) throw new UserError("Funcionário não encontrado.");
    await tx.employee.update({ where: { id }, data: { active: true, pinLookup: lookup, pinHash: hash } });
    await writeAudit(tx, {
      ...actor,
      action: "RESET_PIN",
      entity: "Employee",
      entityId: id,
      before: { active: before.active },
      after: { active: true },
    });
  });
  return pin;
}

type CatalogInput =
  | { kind: "position" }
  | { kind: "department" }
  | { kind: "schedule"; dailyMinutes: number; breakMinutes: number; toleranceMinutes: number; workDays: number[] };

export async function createCatalog(input: CatalogInput, name: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    let created: { id: string };
    if (input.kind === "position") created = await tx.position.create({ data: { name } });
    else if (input.kind === "department") created = await tx.department.create({ data: { name } });
    else {
      created = await tx.workSchedule.create({
        data: {
          name,
          dailyMinutes: input.dailyMinutes,
          breakMinutes: input.breakMinutes,
          toleranceMinutes: input.toleranceMinutes,
          workDays: input.workDays,
        },
      });
    }
    await writeAudit(tx, { ...actor, action: "CATALOG_CHANGE", entity: input.kind, entityId: created.id, after: { name, ...input } });
  });
}
