import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GlobalShell } from "@/components/layout/global-shell";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Tex2Film - استودیو هوشمند تولید ویدیو",
  description: "پلتفرم حرفه‌ای تولید ویدیو با هوش مصنوعی - از ایده تا خروجی نهایی | نیرو گرفته از FX AI",
  keywords: ["ویدیو", "هوش مصنوعی", "تولید محتوا", "AI", "video production", "Tex2Film"],
  authors: [{ name: "Tex2Film" }],
  openGraph: {
    title: "Tex2Film - استودیو هوشمند تولید ویدیو",
    description: "پلتفرم حرفه‌ای تولید ویدیو با هوش مصنوعی - نیرو گرفته از FX AI",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0a14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <GlobalShell>
                {children}
              </GlobalShell>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
