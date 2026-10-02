"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname.startsWith(href) ? "bg-teal-500/15 text-teal-300" : "text-slate-300 hover:bg-white/10 hover:text-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
