"use client";

import {
  Database,
  Eye,
  Lock,
  Share2,
  Trash2,
  Bell,
  Shield,
  UserCheck,
  Server,
  Cookie,
  Mail,
} from "lucide-react";
import {
  DocsShell,
  DocSection,
  DocCard,
  DocHighlight,
} from "@/components/docs/docs-shell";

const SECTIONS = [
  { id: "collected", label: "اطلاعات جمع‌آوری‌شده" },
  { id: "usage", label: "نحوه استفاده" },
  { id: "ai-processing", label: "پردازش AI" },
  { id: "sharing", label: "اشتراک‌گذاری" },
  { id: "retention", label: "نگهداری داده" },
  { id: "security", label: "امنیت" },
  { id: "rights", label: "حقوق شما" },
  { id: "cookies", label: "کوکی‌ها" },
  { id: "contact-privacy", label: "تماس" },
];

const DATA_COLLECTED = [
  {
    icon: UserCheck,
    title: "اطلاعات حساب",
    body: "نام، ایمیل، رمز عبور (هش‌شده)، و اطلاعات پروفایل هنگام ثبت‌نام.",
  },
  {
    icon: Server,
    title: "محتوای پروژه",
    body: "متن‌ها، پرامپت‌ها، تصاویر، ویدیوها، و صداهایی که در پروژه‌هایتان آپلود یا تولید می‌کنید.",
  },
  {
    icon: Eye,
    title: "داده‌های استفاده",
    body: "لاگ‌های دسترسی، بازدیدها، اقدامات در پلتفرم، و داده‌های عملکردی برای بهبود خدمات.",
  },
  {
    icon: Database,
    title: "داده‌های پرداخت",
    body: "اطلاعات صورتحساب از طریق درگاه‌های پرداخت امن. اطلاعات کارت مستقیماً ذخیره نمی‌شود.",
  },
];

const USER_RIGHTS = [
  {
    icon: Eye,
    title: "دسترسی",
    body: "می‌توانید در هر زمانی نسخه کاملی از داده‌هایتان را درخواست کنید.",
  },
  {
    icon: Trash2,
    title: "حذف",
    body: "درخواست حذف کامل حساب و داده‌ها در ۳۰ روز پردازش می‌شود.",
  },
  {
    icon: Bell,
    title: "ویرایش",
    body: "اطلاعات پروفایل را در هر زمانی از تنظیمات حساب ویرایش کنید.",
  },
  {
    icon: Share2,
    title: "قابلیت انتقال",
    body: "داده‌هایتان را در فرمت استاندارد (JSON/CSV) دریافت کنید.",
  },
];

export default function PrivacyPage() {
  return (
    <DocsShell
      badge="حریم خصوصی"
      badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      title="سیاست حریم خصوصی"
      titleEn="Privacy Policy"
      subtitle="ما به حریم خصوصی شما اهمیت می‌دهیم. این سند توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌کنیم، چرا، و چگونه از آن‌ها استفاده می‌کنیم."
      accentFrom="from-emerald-500"
      accentTo="to-teal-400"
      sections={SECTIONS}
    >
      <DocHighlight>
        آخرین به‌روزرسانی: خرداد ۱۴۰۵ — این سیاست برای تمام کاربران Tex2Film اعمال می‌شود. استفاده از پلتفرم به معنای موافقت با این سیاست است.
      </DocHighlight>

      <div className="mt-10" />

      <DocSection id="collected" title="اطلاعاتی که جمع‌آوری می‌کنیم">
        <p>
          ما تنها اطلاعاتی را جمع‌آوری می‌کنیم که برای ارائه خدمات ضروری است. این اطلاعات شامل دو دسته کلی می‌شود:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {DATA_COLLECTED.map((item) => (
            <DocCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
          ))}
        </div>
        <p className="mt-4 text-sm">
          ما اطلاعاتی مثل <strong className="text-foreground">مکان دقیق، مخاطبین، یا تاریخچه مرورگر</strong> جمع‌آوری نمی‌کنیم.
        </p>
      </DocSection>

      <DocSection id="usage" title="نحوه استفاده از اطلاعات">
        <p>
          اطلاعات جمع‌آوری‌شده برای اهداف زیر استفاده می‌شود:
        </p>
        <ul className="list-none space-y-3 mt-3">
          {[
            { t: "ارائه و شخصی‌سازی خدمات", d: "ذخیره پروژه‌ها، تنظیمات، و تاریخچه کار شما." },
            { t: "بهبود پلتفرم", d: "تحلیل الگوهای استفاده برای بهتر کردن تجربه کاربری." },
            { t: "ارتباطات ضروری", d: "ارسال ایمیل‌های تراکنشی مانند تأیید ثبت‌نام، فاکتور، و اطلاعیه امنیتی." },
            { t: "پشتیبانی", d: "پاسخ به درخواست‌های کمک و حل مشکلات فنی." },
          ].map((item) => (
            <li key={item.t} className="flex items-start gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{item.t}</p>
                <p className="text-sm text-muted-foreground">{item.d}</p>
              </div>
            </li>
          ))}
        </ul>
        <DocHighlight>
          ما داده‌های شما را به هیچ شبکه تبلیغاتی نمی‌فروشیم و از آن برای تبلیغات هدفمند استفاده نمی‌کنیم.
        </DocHighlight>
      </DocSection>

      <DocSection id="ai-processing" title="پردازش هوش مصنوعی">
        <p>
          Tex2Film از مدل‌های AI شخص ثالث برای ارائه خدمات استفاده می‌کند. مهم است بدانید:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <DocCard
            icon={Server}
            title="Kling AI"
            body="پرامپت‌های ویدیویی شما برای پردازش به سرورهای Kling ارسال می‌شود. داده‌ها طبق سیاست Kling پردازش می‌شوند."
          />
          <DocCard
            icon={Server}
            title="ElevenLabs"
            body="متن گویندگی و پرامپت‌های صوتی برای پردازش به ElevenLabs ارسال می‌شود."
          />
          <DocCard
            icon={Lock}
            title="آموزش مدل"
            body="محتوای شما برای آموزش مدل‌های ما یا شخص ثالث استفاده نمی‌شود مگر با رضایت صریح شما."
          />
          <DocCard
            icon={Shield}
            title="ذخیره‌سازی"
            body="خروجی‌های AI در فضای ابری امن ذخیره می‌شوند و تنها از طریق حساب شما قابل دسترس هستند."
          />
        </div>
      </DocSection>

      <DocSection id="sharing" title="اشتراک‌گذاری اطلاعات">
        <p>
          ما اطلاعات شما را با اشخاص ثالث <strong className="text-foreground">به اشتراک نمی‌گذاریم</strong> مگر در موارد زیر:
        </p>
        <ul className="list-none space-y-2 mt-3">
          {[
            "ارائه‌دهندگان خدمات ضروری (مثل پردازش پرداخت، هاستینگ) که تحت توافق محرمانگی هستند.",
            "الزامات قانونی — در صورت دریافت دستور قضایی معتبر.",
            "در صورت ادغام یا تملک شرکت — با اطلاع‌رسانی قبلی به کاربران.",
            "با رضایت صریح شما.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="retention" title="نگهداری داده">
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-right px-4 py-3 font-semibold text-foreground">نوع داده</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">مدت نگهداری</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: "داده‌های حساب", dur: "تا زمان حذف حساب" },
                { type: "پروژه‌ها و محتوا", dur: "تا زمان حذف حساب یا پروژه" },
                { type: "لاگ‌های دسترسی", dur: "۹۰ روز" },
                { type: "داده‌های پرداخت", dur: "۵ سال (الزامات مالی)" },
                { type: "ایمیل‌های پشتیبانی", dur: "۲ سال" },
              ].map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                  <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{row.dur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="security" title="امنیت داده">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Lock, title: "رمزنگاری", body: "تمام داده‌ها در حالت انتقال با TLS 1.3 و در حالت سکون با AES-256 رمزنگاری می‌شوند." },
            { icon: Shield, title: "احراز هویت", body: "رمزهای عبور با bcrypt هش می‌شوند. احراز هویت دو مرحله‌ای (2FA) در دسترس است." },
            { icon: Server, title: "زیرساخت امن", body: "هاستینگ روی ابر با استانداردهای امنیتی بالا و آزمون نفوذ دوره‌ای." },
            { icon: Bell, title: "اطلاع‌رسانی نقض", body: "در صورت نقض داده، ظرف ۷۲ ساعت به کاربران آسیب‌دیده اطلاع می‌دهیم." },
          ].map((item) => (
            <DocCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
          ))}
        </div>
      </DocSection>

      <DocSection id="rights" title="حقوق شما">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {USER_RIGHTS.map((r) => (
            <DocCard key={r.title} icon={r.icon} title={r.title} body={r.body} />
          ))}
        </div>
        <p className="mt-5">
          برای اعمال هر یک از این حقوق، از طریق بخش <strong className="text-foreground">تنظیمات حساب</strong> اقدام کنید یا به آدرس ایمیل پایین این صفحه پیام دهید.
        </p>
      </DocSection>

      <DocSection id="cookies" title="کوکی‌ها">
        <div className="flex gap-3 items-start">
          <Cookie className="w-5 h-5 text-muted-foreground/60 shrink-0 mt-0.5" />
          <p>
            Tex2Film از کوکی‌های ضروری برای احراز هویت و کوکی‌های تحلیلی ناشناس برای بهبود خدمات استفاده می‌کند. کوکی‌های تبلیغاتی یا ردیابی مستقل استفاده نمی‌شود.
          </p>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-right px-4 py-3 font-semibold text-foreground">نوع کوکی</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">هدف</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">قابل غیرفعال‌سازی</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: "ضروری", purpose: "احراز هویت و امنیت", disable: "خیر" },
                { type: "ترجیحات", purpose: "ذخیره تنظیمات (تم، زبان)", disable: "بله" },
                { type: "تحلیلی", purpose: "آمار ناشناس بازدید", disable: "بله" },
              ].map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                  <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                  <td className={`px-4 py-3 font-medium ${row.disable === "بله" ? "text-emerald-400" : "text-muted-foreground"}`}>{row.disable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection id="contact-privacy" title="تماس با مسئول حریم خصوصی">
        <p>
          برای سوالات مربوط به حریم خصوصی یا اعمال حقوق خود:
        </p>
        <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-5 flex items-center gap-4">
          <Mail className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">privacy@tex2film.ai</p>
            <p className="text-xs text-muted-foreground mt-0.5">زمان پاسخ: حداکثر ۵ روز کاری</p>
          </div>
        </div>
      </DocSection>
    </DocsShell>
  );
}
