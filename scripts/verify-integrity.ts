import { PrismaClient } from "@prisma/client";
import { chainHash } from "../src/lib/security";

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.timeRecord.findMany({ orderBy: [{ employeeId: "asc" }, { seq: "asc" }] });
  const previous = new Map<string, string>();
  const broken: string[] = [];

  for (const r of records) {
    const expected = chainHash(previous.get(r.employeeId) ?? "GENESIS", r);
    if (expected !== r.integrityHash) broken.push(`${r.id} (employee ${r.employeeId}, seq ${r.seq})`);
    previous.set(r.employeeId, r.integrityHash);
  }

  console.log(`${records.length} registros verificados.`);
  if (broken.length > 0) {
    console.error(`Adulteração detectada em ${broken.length} registro(s):\n${broken.join("\n")}`);
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
