import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardList, FileText, LayoutDashboard, ShoppingCart, Settings, Wrench } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";

const navItems = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/catalog", label: "Catalog", icon: ShoppingCart },
  { href: "/requests", label: "Requests", icon: LayoutDashboard },
  { href: "/requests/new", label: "New request", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: Wrench },
  { href: "/admin/templates", label: "Templates", icon: FileText }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink font-black text-white">
              C
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-steel">Cohvera</p>
              <h1 className="truncate text-xl font-bold text-ink">Quotation Requests</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-right sm:flex">
            <div>
              <p className="text-sm font-semibold text-ink">{user.name}</p>
              <p className="text-xs text-steel">
                {user.company.name} - {roleLabels[user.role]}
              </p>
            </div>
            <Settings className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <nav className="panel flex gap-2 overflow-x-auto p-2 lg:block lg:space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-ink"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
