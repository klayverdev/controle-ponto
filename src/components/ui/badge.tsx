import type { DayStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
} as const;

export const Badge = ({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
    {children}
  </span>
);

const DAY: Record<DayStatus, { label: string; tone: keyof typeof tones }> = {
  OK: { label: "Completo", tone: "sky" },
  OPEN: { label: "Presente", tone: "green" },
  INCONSISTENT: { label: "Inconsistente", tone: "red" },
  ABSENT: { label: "Ausente", tone: "slate" },
};

export const DayBadge = ({ status }: { status: DayStatus }) => <Badge tone={DAY[status].tone}>{DAY[status].label}</Badge>;
