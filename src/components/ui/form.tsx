import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, className)} {...p} />
);

export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(control, className)} {...p} />
);

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
    {label}
    {children}
  </label>
);

export const Card = ({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
    {title && <h2 className="mb-4 text-base font-semibold text-slate-800">{title}</h2>}
    {children}
  </section>
);

export const Table = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
  <div className="-mx-2 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>{head.map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/70">{children}</tbody>
    </table>
  </div>
);

export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>
);
