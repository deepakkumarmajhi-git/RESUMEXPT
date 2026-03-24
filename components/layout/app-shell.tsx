"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Upload,
  Sparkles,
  History,
  Settings,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/interviews", label: "Interviews", icon: MessageSquare },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: Settings },
];

const SIDEBAR_STORAGE_KEY = "resumexpt.sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedState == null) {
      return;
    }

    queueMicrotask(() => {
      setIsSidebarCollapsed(storedState === "true");
    });
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((currentCollapsed) => {
      const nextCollapsed = !currentCollapsed;
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(nextCollapsed),
      );
      return nextCollapsed;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "hide-scrollbar fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col overflow-y-auto border-r border-border/60 bg-[color:color-mix(in_srgb,var(--card)_92%,white)]/95 px-6 py-6 backdrop-blur-xl transition-[transform,width,padding] duration-300 ease-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isSidebarCollapsed && "lg:w-24 lg:px-3 lg:py-5",
        )}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3",
              isSidebarCollapsed && "lg:gap-0",
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className={cn(isSidebarCollapsed && "lg:hidden")}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                ResumeXpt
              </p>
              
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-2xl lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="h-5 w-5" />
              ) : (
                <ChevronsLeft className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav className="mt-10 flex-1 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isSidebarCollapsed && "lg:justify-center lg:px-0",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(isSidebarCollapsed && "lg:hidden")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-12 rounded-[1.6rem] border border-border/60 bg-secondary/40 p-4",
            isSidebarCollapsed && "lg:px-2 lg:py-3",
          )}
        >
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.24em] text-primary",
              isSidebarCollapsed && "lg:hidden",
            )}
          >
            Signed in as
          </p>
          <div
            className={cn(
              "mt-3 flex items-center gap-3",
              isSidebarCollapsed && "lg:mt-0 lg:flex-col lg:gap-2",
            )}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {user.name?.slice(0, 2).toUpperCase() || "AI"}
              </AvatarFallback>
            </Avatar>
            <div className={cn("min-w-0", isSidebarCollapsed && "lg:hidden")}>
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className={cn(
              "mt-4 w-full justify-start rounded-2xl",
              isSidebarCollapsed && "lg:justify-center lg:px-0",
            )}
            onClick={async () => {
              await signOut({ redirect: false });
              router.push("/");
              router.refresh();
            }}
            aria-label="Logout"
            title={isSidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4" />
            <span className={cn(isSidebarCollapsed && "lg:hidden")}>
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {isMobileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 ease-out",
          isSidebarCollapsed ? "lg:pl-24" : "lg:pl-[280px]",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
