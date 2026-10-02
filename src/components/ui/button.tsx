import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-teal-600 text-white shadow-sm hover:bg-teal-500",
  outline: "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500",
  ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
} as const;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants };

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
