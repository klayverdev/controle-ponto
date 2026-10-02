import { z } from "zod";
import { apiAuth } from "@/lib/auth/guard";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formatMinutes } from "@/lib/timezone";
import { writeAudit } from "@/server/repositories/audit-repository";
import { generalPdf } from "@/server/services/generate-pdf";
import { generalReport } from "@/server/services/generate-report";

export const dynamic = "force-dynamic";

const query = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
  format: z.enum(["pdf", "csv"]),
});

export async function GET(req: Request) {
  const auth = await apiAuth("reports:read");
  if ("error" in auth) return new Response(null, { status: auth.error });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    const { year, month, format } = parsed.data;
    const report = await generalReport(year, month);
    await writeAudit(prisma, {
      userId: auth.user.id,
      ip: auth.ip,
      userAgent: auth.userAgent,
      action: "GENERATE_REPORT",
      entity: "Report",
      after: { type: "general", format, year, month },
    });
    const name = `relatorio-geral-${year}-${String(month).padStart(2, "0")}.${format}`;
    const body =
      format === "pdf"
        ? new Uint8Array(await generalPdf(report))
        : toCsv(
            ["Funcionário", "Setor", "Dias trabalhados", "Horas trabalhadas", "Horas extras", "Déficit"],
            report.rows.map((r) => [r.name, r.department, r.days, formatMinutes(r.worked), formatMinutes(r.overtime), formatMinutes(r.deficit)]),
          );
    return new Response(body, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("report.general", error);
    return new Response(null, { status: 500 });
  }
}
