import { z } from "zod";
import { apiAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/server/repositories/audit-repository";
import { individualPdf } from "@/server/services/generate-pdf";
import { individualReport } from "@/server/services/generate-report";

export const dynamic = "force-dynamic";

const query = z.object({
  employeeId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(req: Request) {
  const auth = await apiAuth("reports:read");
  if ("error" in auth) return new Response(null, { status: auth.error });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    const { employeeId, year, month } = parsed.data;
    const pdf = await individualPdf(await individualReport(employeeId, year, month));
    await writeAudit(prisma, {
      userId: auth.user.id,
      ip: auth.ip,
      userAgent: auth.userAgent,
      action: "GENERATE_REPORT",
      entity: "Employee",
      entityId: employeeId,
      after: { type: "individual", year, month },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="folha-ponto-${year}-${String(month).padStart(2, "0")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("report.individual", error);
    return new Response(null, { status: 500 });
  }
}
