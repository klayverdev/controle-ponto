export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
);
