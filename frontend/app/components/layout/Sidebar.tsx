"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderGit2,
  FileText,
  LayoutTemplate,
  Network,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";

const mainNav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Repositories", href: "/repos", icon: FolderGit2 },
  { name: "Documents", href: "/docs", icon: FileText },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Diagrams", href: "/diagrams", icon: Network },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("access_token"));
  }, []);

  const bottomNav = isAuthenticated
    ? [
        { name: "Help & Docs", href: "/help", icon: HelpCircle },
        { name: "Logout", href: "/logout", icon: LogOut },
      ]
    : [
        { name: "Help & Docs", href: "/help", icon: HelpCircle },
        { name: "Sign in", href: "/login", icon: LogIn },
        { name: "Sign up", href: "/signup", icon: UserPlus },
      ];

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col bg-sidebar shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px]" style={{ background: 'linear-gradient(90deg, #5B3DF5, #6D5EF7)' }}>
            <LayoutDashboard className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-text-active">
            ThesisForge
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-active lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-2" />

        {/* Main Nav */}
        <div className="flex-1 overflow-y-auto px-3">
          <nav className="flex flex-col gap-1">
            {mainNav.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "text-white"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(90deg, #5B3DF5, #6D5EF7)',
                    boxShadow: '0 0 18px rgba(91,61,245,0.28)'
                  } : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Nav */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <nav className="flex flex-col gap-1">
            {bottomNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className="group flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-text transition-all duration-150 hover:bg-sidebar-hover hover:text-sidebar-text-active"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
