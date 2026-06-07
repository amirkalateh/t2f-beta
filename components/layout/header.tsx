"use client";

import Link from "next/link";
import SafeImage from "@/components/ui/safe-image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Sparkles, LogIn, LogOut, User, Crown, Shield, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { TIER_LIMITS } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "خانه", href: "/", icon: Sparkles },
  { name: "پروژه‌ها", href: "/projects", icon: LayoutDashboard },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const tierInfo = user?.tier ? TIER_LIMITS[user.tier] : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="relative w-8 h-8">
              <SafeImage
                src="/tex2film-logo.png"
                alt="Tex2Film"
                fill
                className="object-contain dark:invert"
                priority
              />
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    data-testid={`link-nav-${item.name}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-20 h-9 rounded-md bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid="button-admin">
                    <Shield className="w-4 h-4" />
                    پنل مدیریت
                  </Button>
                </Link>
              )}
              <Link href="/support">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="button-support">
                  <Ticket className="w-4 h-4" />
                  پشتیبانی
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="aiGenerate" className="gap-2" data-testid="button-start-project">
                  <Sparkles className="w-4 h-4" />
                  شروع پروژه
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    data-testid="button-user-menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {(user.displayName || user.username).charAt(0)}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.displayName || user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                    {tierInfo && (
                      <Badge variant="secondary" className="mt-1.5" data-testid="badge-user-tier">
                        <Crown className="w-3 h-3 ml-1" />
                        {tierInfo.label}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/support")}
                    className="gap-2 cursor-pointer"
                    data-testid="link-support"
                  >
                    <Ticket className="w-4 h-4" />
                    پشتیبانی
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/pricing")}
                    className="gap-2 cursor-pointer"
                    data-testid="link-pricing"
                  >
                    <Crown className="w-4 h-4" />
                    ارتقا پلن
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    خروج از حساب
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button className="gap-2" data-testid="button-login">
                <LogIn className="w-4 h-4" />
                ورود
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
