"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  Video,
  Music,
  Users,
  Film,
  Sparkles,
  Crown,
  BookOpen,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Mic,
  Wand2,
  Camera,
  Clapperboard,
  ImagePlus,
  Compass,
  Moon,
  Sun,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FXLogo } from "@/components/layout/fx-logo";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { TIER_LIMITS } from "@/lib/constants";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavFeature {
  label: string;
  href: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavModel {
  name: string;
  badge?: string;
}

interface NavItemConfig {
  id: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string;
  features?: NavFeature[];
  models?: NavModel[];
}

const navItems: NavItemConfig[] = [
  {
    id: "image",
    label: "تصویر",
    icon: ImagePlus,
    features: [
      {
        label: "ساخت تصویر",
        href: "/image",
        description: "تولید تصویر با هوش مصنوعی",
        icon: ImagePlus,
      },
      {
        label: "تصویر سینمایی",
        href: "/image?mode=cinema",
        description: "شبیه‌سازی واقعی دوربین و لنز",
        icon: Camera,
      },
    ],
    models: [
      { name: "Kling v3 Omni", badge: "BEST" },
      { name: "Kling v3" },
      { name: "Kling v2.1" },
      { name: "Kling v2" },
    ],
  },
  {
    id: "video",
    label: "ویدیو",
    icon: Video,
    features: [
      {
        label: "ساخت ویدیو",
        href: "/video",
        description: "تولید ویدیوی سینمایی",
        icon: Film,
      },
      {
        label: "تبدیل تصویر به ویدیو",
        href: "/video?mode=i2v",
        description: "انیمیشن تصاویر ثابت",
        icon: Wand2,
      },
    ],
  },
  {
    id: "sound",
    label: "صدا",
    icon: Music,
    features: [
      {
        label: "گفتار",
        href: "/sound?tab=tts",
        description: "تبدیل متن به صدای طبیعی",
        icon: Mic,
      },
      {
        label: "افکت صوتی",
        href: "/sound?tab=sfx",
        description: "تولید افکت صوتی با AI",
        icon: Sparkles,
      },
      {
        label: "موسیقی",
        href: "/sound?tab=music",
        description: "ساخت موسیقی با ElevenLabs",
        icon: Music,
      },
    ],
  },
  {
    id: "character",
    label: "شخصیت",
    href: "/character",
    icon: Users,
  },
  {
    id: "cinema-studio",
    label: "سینما استودیو",
    href: "/projects",
    icon: Clapperboard,
    badge: "2.0",
  },
  {
    id: "explore",
    label: "کاوش",
    href: "/explore",
    icon: Compass,
  },
  {
    id: "docs",
    label: "مستندات",
    href: "/docs",
    icon: BookOpen,
  },
  {
    id: "support",
    label: "پشتیبانی",
    href: "/support",
    icon: Ticket,
  },
];

const utilityLinks = [
  { id: "explore", label: "کاوش", href: "/explore" },
  { id: "pricing", label: "تعرفه‌ها", href: "/pricing" },
  { id: "support", label: "پشتیبانی", href: "/support" },
];

const dropdownVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as number[] },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.96,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

const mobileMenuVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring", damping: 28, stiffness: 320 },
  },
  exit: { x: "100%", transition: { duration: 0.2, ease: "easeIn" } },
};

export function MegaNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

  const { theme, setTheme } = useTheme();
  const tierInfo = user?.tier ? TIER_LIMITS[user.tier] : null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const hasDropdown = (item: NavItemConfig) => !!item.features;

  const handleMouseEnter = (itemId: string) => {
    if (dropdownTimeout.current) {
      clearTimeout(dropdownTimeout.current);
      dropdownTimeout.current = null;
    }
    setActiveDropdown(itemId);
  };

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    };
  }, []);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 h-14 glass border-b border-border/50"
        dir="rtl"
        data-testid="nav-header"
      >
        <div className="max-w-[1400px] mx-auto h-full flex items-center px-4 lg:px-6 gap-4">
          {/* START (RTL right side): Login CTA + Logo + user actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* CTA first — rightmost in RTL */}
            {isLoading ? (
              <div className="w-20 h-9 rounded-lg bg-muted/20 animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full p-0.5 ring-1 ring-primary/30 hover:ring-primary/60 transition-all duration-300"
                    data-testid="button-user-menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                      {(user.displayName || user.username).charAt(0)}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                    {tierInfo && (
                      <Badge
                        variant="secondary"
                        className="mt-1.5"
                        data-testid="badge-user-tier"
                      >
                        <Crown className="w-3 h-3 ms-1" />
                        {tierInfo.label}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/projects")}
                    className="gap-2 cursor-pointer"
                    data-testid="nav-dropdown-my-projects"
                  >
                    <Film className="w-4 h-4" /> پروژه‌های من
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/pricing")}
                    className="gap-2 cursor-pointer"
                    data-testid="nav-dropdown-upgrade"
                  >
                    <Crown className="w-4 h-4" /> ارتقا پلن
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/support")}
                    className="gap-2 cursor-pointer"
                    data-testid="nav-dropdown-support"
                  >
                    <Ticket className="w-4 h-4" /> پشتیبانی
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" /> خروج از حساب
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button
                  size="lg"
                  variant="aiGenerate"
                  className="gap-2 h-12 rounded-full px-8 text-base whitespace-nowrap"
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4" /> ورود
                </Button>
              </Link>
            )}

            <div
              className="shrink-0 hover:opacity-90 transition-opacity duration-300"
              data-testid="nav-logo"
            >
              <FXLogo size="lg" showText={false} href="/" />
            </div>

            {/* Credits badge */}
            {isAuthenticated && user && (
              <Link
                href="/pricing"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/8 hover:bg-primary/12 transition-colors"
                data-testid="nav-credits"
              >
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {(user.credits ?? 0).toLocaleString("fa-IR")}
                </span>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden lg:flex"
              data-testid="button-theme-toggle"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {isAuthenticated && user && <NotificationBell />}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          {/* CENTRE: Spacer */}
          <div className="flex-1" />

          {/* END (RTL left side): Desktop nav */}
          <div
            className="hidden lg:flex items-center gap-0.5 shrink-0"
            data-testid="nav-main"
          >
            {!isAuthenticated ? (
              navItems.map((item) => (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() =>
                    hasDropdown(item) ? handleMouseEnter(item.id) : undefined
                  }
                  onMouseLeave={() =>
                    hasDropdown(item) ? handleMouseLeave() : undefined
                  }
                >
                  {item.href && !hasDropdown(item) ? (
                    <Link href={item.href} data-testid={`nav-${item.id}`}>
                      <span
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${pathname === item.href ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 leading-tight"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <button
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${activeDropdown === item.id ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => {
                        if (item.features && item.features.length > 0)
                          router.push(item.features[0].href);
                      }}
                      data-testid={`nav-${item.id}`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 leading-tight"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {hasDropdown(item) && (
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === item.id ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>
                  )}
                  <AnimatePresence>
                    {activeDropdown === item.id && hasDropdown(item) && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute top-full pt-2 end-0"
                        style={{ minWidth: item.models ? "400px" : "260px" }}
                        onMouseEnter={() => handleMouseEnter(item.id)}
                        onMouseLeave={handleMouseLeave}
                        data-testid={`nav-dropdown-${item.id}`}
                      >
                        <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-2xl p-3 shadow-2xl">
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-0.5">
                              <p className="text-[11px] font-medium text-muted-foreground mb-2 px-2">
                                ویژگی‌ها
                              </p>
                              {item.features?.map((feature) => {
                                const FeatureIcon = feature.icon;
                                return (
                                  <Link
                                    key={feature.href}
                                    href={feature.href}
                                    onClick={() => setActiveDropdown(null)}
                                    data-testid={`nav-dropdown-${item.id}-${feature.label.replace(/\s+/g, "-")}`}
                                  >
                                    <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-accent active:bg-accent/80 transition-colors">
                                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <FeatureIcon className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">
                                            {feature.label}
                                          </span>
                                          {feature.badge && (
                                            <Badge
                                              variant="secondary"
                                              className="text-[9px] px-1 py-0"
                                            >
                                              {feature.badge}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                          {feature.description}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                            {item.models && (
                              <div className="w-36 border-s border-border ps-3">
                                <p className="text-[11px] font-medium text-muted-foreground mb-2 px-2">
                                  مدل‌ها
                                </p>
                                <div className="space-y-0.5">
                                  {item.models.map((model) => (
                                    <div
                                      key={model.name}
                                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
                                      data-testid={`nav-dropdown-model-${model.name.replace(/\s+/g, "-")}`}
                                    >
                                      <Sparkles className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {model.name}
                                      </span>
                                      {model.badge && (
                                        <Badge
                                          variant="default"
                                          className="text-[9px] px-1 py-0 shrink-0"
                                        >
                                          {model.badge}
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              /* Authenticated: polished tool strip */
              <div className="flex items-center gap-0.5 bg-muted/30 rounded-xl px-1.5 py-1 border border-border/20">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.id}
                      href={item.href || item.features?.[0]?.href || "#"}
                      data-testid={`nav-${item.id}`}
                    >
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${isActive ? "text-primary bg-primary/10 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
                      >
                        <item.icon
                          className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`}
                        />
                        {item.label}
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 leading-tight"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[100] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="nav-mobile-overlay"
            />
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 start-0 bottom-0 w-80 max-w-[85vw] z-[110] bg-background/95 backdrop-blur-2xl border-e border-border shadow-2xl overflow-y-auto scrollbar-thin lg:hidden"
              dir="rtl"
              data-testid="nav-mobile-menu"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <FXLogo size="sm" href="/" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="button-mobile-close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 space-y-1">
                {navItems.map((item) => (
                  <div key={item.id}>
                    {item.href && !hasDropdown(item) ? (
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`nav-mobile-${item.id}`}
                      >
                        <div
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname === item.href ? "text-primary bg-primary/10" : "text-foreground hover:bg-accent"}`}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <>
                        <button
                          className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                          onClick={() =>
                            setMobileExpanded(
                              mobileExpanded === item.id ? null : item.id,
                            )
                          }
                          data-testid={`nav-mobile-${item.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${mobileExpanded === item.id ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence>
                          {mobileExpanded === item.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ps-10 space-y-0.5 pb-2">
                                {item.features?.map((feature) => {
                                  const FeatureIcon = feature.icon;
                                  return (
                                    <Link
                                      key={feature.href}
                                      href={feature.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      data-testid={`nav-mobile-dropdown-${feature.label.replace(/\s+/g, "-")}`}
                                    >
                                      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                        <FeatureIcon className="w-3.5 h-3.5" />
                                        <span>{feature.label}</span>
                                        {feature.badge && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0"
                                          >
                                            {feature.badge}
                                          </Badge>
                                        )}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                ))}

                <div className="border-t border-border pt-3 mt-3">
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="nav-mobile-pricing"
                  >
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                      <Crown className="w-4 h-4" />
                      تعرفه‌ها
                    </div>
                  </Link>
                </div>

                {isAuthenticated && user && (
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                      {tierInfo && (
                        <Badge variant="secondary" className="mt-1.5">
                          <Crown className="w-3 h-3 ms-1" />
                          {tierInfo.label}
                        </Badge>
                      )}
                    </div>
                    <Link
                      href="/projects"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="nav-mobile-my-projects"
                    >
                      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                        <Film className="w-4 h-4" />
                        پروژه‌های من
                      </div>
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="nav-mobile-support"
                    >
                      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                        <Ticket className="w-4 h-4" />
                        پشتیبانی
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      خروج از حساب
                    </button>
                  </div>
                )}

                <div className="border-t border-border pt-3 mt-3">
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    data-testid="button-mobile-theme-toggle"
                  >
                    <Sun className="w-4 h-4 dark:hidden" />
                    <Moon className="w-4 h-4 hidden dark:block" />
                    {theme === "dark" ? "حالت روشن" : "حالت تاریک"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
