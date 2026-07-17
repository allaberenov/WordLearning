"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CircleUserRound,
  LogOut,
  Repeat2,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";

const navItems = [
  { href: "/decks", label: "Наборы", icon: BookOpen },
  { href: "/review", label: "Повторение", icon: Repeat2 },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/profile", label: "Профиль", icon: CircleUserRound }
];

export function AppShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: { email: string; name: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast({ title: "Вы вышли из аккаунта" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/decks" className="focus-ring flex items-center gap-2 rounded-md">
            <BrandLogo subtitle={user.name || user.email} compact />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "focus-ring inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                    active && "bg-secondary text-foreground shadow-soft"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Button type="button" variant="ghost" size="icon" onClick={logout} title="Выйти">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                active && "text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
