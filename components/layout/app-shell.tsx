"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <AppSidebar />
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          isAuthenticated ? "pe-[60px]" : "",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
