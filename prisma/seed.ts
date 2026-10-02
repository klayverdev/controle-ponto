import { PrismaClient } from "@prisma/client";
import { env } from "../src/lib/env";
import { hashSecret, pinLookup, randomToken, sha256 } from "../src/lib/security";

const prisma = new PrismaClient();
const production = env.NODE_ENV === "production";

async function seedAdmin() {
  if (await prisma.user.findUnique({ where: { username: "admin" } })) return;
  if (!env.ADMIN_INITIAL_PASSWORD) throw new Error("ADMIN_INITIAL_PASSWORD é obrigatório para criar o administrador.");
  await prisma.user.create({
    data: { username: "admin", role: "ADMIN", passwordHash: await hashSecret(env.ADMIN_INITIAL_PASSWORD) },
  });
}

async function seedDevelopment() {
  const [position, department, schedule] = await Promise.all([
    prisma.position.upsert({ where: { name: "Atendente" }, update: {}, create: { name: "Atendente" } }),
    prisma.department.upsert({ where: { name: "Atendimento" }, update: {}, create: { name: "Atendimento" } }),
    prisma.workSchedule.upsert({
      where: { name: "Padrão 8h" },
      update: {},
      create: { name: "Padrão 8h", dailyMinutes: 480, breakMinutes: 60, toleranceMinutes: 10 },
    }),
  ]);

  const people = [
    ["001", "João Silva", "482913"],
    ["002", "Maria Souza", "175306"],
    ["003", "Carlos Oliveira", "360894"],
  ] as const;

  for (const [employeeCode, fullName, pin] of people) {
    await prisma.employee.upsert({
      where: { employeeCode },
      update: {},
      create: {
        employeeCode,
        fullName,
        pinLookup: pinLookup(pin),
        pinHash: await hashSecret(pin),
        positionId: position.id,
        departmentId: department.id,
        workScheduleId: schedule.id,
      },
    });
  }

  const token = process.env.KIOSK_DEV_TOKEN ?? randomToken(32);
  await prisma.kioskDevice.upsert({
    where: { tokenHash: sha256(token) },
    update: {},
    create: { name: "Terminal de desenvolvimento", tokenHash: sha256(token) },
  });
  console.log(`Token do terminal de desenvolvimento (ative em /ativar): ${token}`);
  console.log("PINs de desenvolvimento: João 482913 | Maria 175306 | Carlos 360894");
}

async function main() {
  await seedAdmin();
  if (!production) await seedDevelopment();
}

main().finally(() => prisma.$disconnect());
