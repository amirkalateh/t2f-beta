import Link from "next/link";
import { FXLogo, FXAILogo } from "@/components/layout/fx-logo";

const FOOTER_COLS = [
  {
    heading: "پلتفرم",
    links: [
      { label: "پروژه‌ها", href: "/projects" },
      { label: "کاوش", href: "/explore" },
      { label: "تعرفه‌ها", href: "/pricing" },
      { label: "پشتیبانی", href: "/support" },
    ],
  },
  {
    heading: "شرکت",
    links: [
      { label: "درباره ما", href: "/about" },
      { label: "مستندات", href: "/docs" },
      { label: "تماس با ما", href: "/contact" },
    ],
  },
  {
    heading: "حقوقی",
    links: [
      { label: "قوانین استفاده", href: "/terms" },
      { label: "حریم خصوصی", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background" dir="rtl">
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-8">

        {/* Top: brand + columns */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 mb-10">
          {/* Brand */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <FXLogo size="md" showText={false} href="/" />
              <div>
                <p className="font-semibold text-sm">Tex2Film</p>
                <p className="text-[11px] text-muted-foreground">سینمای هوش مصنوعی</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-[180px] leading-5">
              از ایده تا فیلم — با قدرتمندترین مدل‌های AI جهان.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 flex-1">
            {FOOTER_COLS.map((col) => (
              <div key={col.heading}>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-3">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Powered by */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-1 self-start md:self-auto">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-1">نیرو گرفته از</p>
            <FXAILogo size="sm" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <span>© {new Date().getFullYear()} FX AI — همه حقوق محفوظ است</span>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-muted-foreground transition-colors">قوانین</Link>
            <span className="text-border/40">·</span>
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors">حریم خصوصی</Link>
            <span className="text-border/40">·</span>
            <span>Tex2Film v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
