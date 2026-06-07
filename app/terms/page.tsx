"use client";

import {
  FileText,
  Shield,
  AlertTriangle,
  Lock,
  CreditCard,
  Ban,
  Scale,
  RefreshCw,
  Mail,
} from "lucide-react";
import {
  DocsShell,
  DocSection,
  DocCard,
  DocHighlight,
} from "@/components/docs/docs-shell";

const SECTIONS = [
  { id: "acceptance", label: "پذیرش شرایط" },
  { id: "services", label: "تعریف خدمات" },
  { id: "account", label: "حساب کاربری" },
  { id: "content", label: "مالکیت محتوا" },
  { id: "credits", label: "اعتبار و اشتراک" },
  { id: "prohibited", label: "موارد غیرمجاز" },
  { id: "disclaimer", label: "سلب مسئولیت" },
  { id: "changes", label: "تغییر شرایط" },
  { id: "contact-legal", label: "تماس" },
];

export default function TermsPage() {
  return (
    <DocsShell
      badge="قانونی"
      badgeColor="bg-blue-500/15 text-blue-400 border-blue-500/25"
      title="قوانین و شرایط استفاده"
      titleEn="Terms of Service"
      subtitle="با استفاده از Tex2Film، این شرایط را می‌پذیرید. لطفاً پیش از استفاده، این سند را با دقت مطالعه کنید."
      accentFrom="from-blue-500"
      accentTo="to-cyan-400"
      sections={SECTIONS}
    >
      <DocHighlight>
        آخرین به‌روزرسانی: خرداد ۱۴۰۵ — این شرایط از لحظه ثبت‌نام یا استفاده از هر بخش از پلتفرم Tex2Film اجرایی می‌شود.
      </DocHighlight>

      <div className="mt-10" />

      <DocSection id="acceptance" title="پذیرش شرایط">
        <p>
          با دسترسی به پلتفرم Tex2Film (وب‌سایت، API، یا هر ابزار مرتبط)، اعلام می‌کنید که این شرایط را خوانده، فهمیده، و پذیرفته‌اید. اگر با هر بخشی موافق نیستید، از استفاده از پلتفرم خودداری کنید.
        </p>
        <p>
          این شرایط بین شما (کاربر) و <strong className="text-foreground">FX AI</strong> (ارائه‌دهنده Tex2Film) منعقد می‌شود. این سند به‌همراه سیاست حریم خصوصی، توافق‌نامه کاملی را تشکیل می‌دهد.
        </p>
      </DocSection>

      <DocSection id="services" title="تعریف خدمات">
        <p>
          Tex2Film یک پلتفرم نرم‌افزاری (SaaS) برای پیش‌تولید و تولید محتوای ویدیویی با هوش مصنوعی است. خدمات شامل:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { icon: FileText, title: "تولید داستان و فیلمنامه", body: "نوشتن ساختار روایی با مدل‌های LLM بر اساس پرامپت یا ایده شما." },
            { icon: Shield, title: "تولید تصویر و ویدیو", body: "ساخت فریم‌های استوری‌بورد و کلیپ‌های ویدیویی با مدل‌های AI." },
            { icon: Mail, title: "استودیوی صدا", body: "تولید موسیقی، گویندگی، و افکت‌های صوتی با ElevenLabs." },
            { icon: Scale, title: "تدوین و خروجی", body: "مونتاژ timeline، میکس صدا، و export ویدیوی نهایی." },
          ].map((s) => <DocCard key={s.title} icon={s.icon} title={s.title} body={s.body} />)}
        </div>
        <p className="mt-4">
          ما حق داریم در هر زمان، بدون اطلاع قبلی، خدمات جدید اضافه کنیم، خدمات موجود را تغییر دهیم، یا بخشی از خدمات را متوقف کنیم.
        </p>
      </DocSection>

      <DocSection id="account" title="حساب کاربری">
        <p>
          برای استفاده از اکثر امکانات Tex2Film، باید یک حساب کاربری ایجاد کنید. شما مسئول هستید:
        </p>
        <ul className="list-none space-y-2 mt-2">
          {[
            "اطلاعات دقیق و به‌روز در پروفایل خود نگه دارید.",
            "از دسترسی غیرمجاز به حساب خود جلوگیری کنید.",
            "هرگونه نقض امنیتی را فوراً به ما گزارش دهید.",
            "حساب خود را به اشتراک نگذارید.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          ما حق داریم حسابی که قوانین را نقض کند یا مشکوک به استفاده غیرمجاز باشد را تعلیق یا حذف کنیم.
        </p>
      </DocSection>

      <DocSection id="content" title="مالکیت محتوا">
        <DocHighlight>
          محتوای تولیدشده توسط AI — شامل ویدیو، تصویر، صدا، و متن — متعلق به شماست، مشروط بر رعایت شرایط این سند و حقوق مدل‌های ثالث.
        </DocHighlight>
        <p className="mt-4">
          با استفاده از پلتفرم، موافقت می‌کنید:
        </p>
        <ul className="list-none space-y-2 mt-2">
          {[
            "محتوای شما برای آموزش مدل‌های AI ما استفاده نمی‌شود مگر با رضایت صریح شما.",
            "Tex2Film مجاز است محتوای مجهول‌الهویه و آماری را برای بهبود خدمات استفاده کند.",
            "هر محتوایی که آپلود می‌کنید، حقوق مالکیت معنوی آن را دارید یا مجاز به استفاده هستید.",
            "محتوای نهایی ممکن است توسط APIهای شخص ثالث (Kling AI، ElevenLabs) پردازش شود.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="credits" title="اعتبار و اشتراک">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <DocCard
            icon={CreditCard}
            title="اعتبارها (Credits)"
            body="هر عملیات AI (تولید ویدیو، تصویر، صدا) مقداری اعتبار مصرف می‌کند. اعتبارهای استفاده‌نشده به ماه بعد منتقل نمی‌شوند."
          />
          <DocCard
            icon={RefreshCw}
            title="تمدید اشتراک"
            body="اشتراک‌های ماهانه در پایان هر دوره به‌طور خودکار تمدید می‌شوند. لغو باید ۲۴ ساعت قبل از تمدید انجام شود."
          />
        </div>
        <p>
          همه پرداخت‌ها قطعی هستند. استرداد وجه صرفاً در موارد اختلال فنی اثبات‌شده از سمت پلتفرم انجام می‌شود. قیمت‌ها ممکن است تغییر کنند — تغییرات حداقل ۳۰ روز قبل اطلاع‌رسانی خواهد شد.
        </p>
      </DocSection>

      <DocSection id="prohibited" title="موارد غیرمجاز">
        <p>
          موارد زیر در استفاده از Tex2Film ممنوع است:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { icon: Ban, title: "محتوای غیرقانونی", body: "تولید محتوایی که قوانین کشور، حقوق افراد، یا قوانین بین‌المللی را نقض کند." },
            { icon: AlertTriangle, title: "فریب و جعل هویت", body: "استفاده از پلتفرم برای ایجاد محتوای گمراه‌کننده یا جعل هویت اشخاص واقعی." },
            { icon: Lock, title: "مهندسی معکوس", body: "تلاش برای دسترسی به کدهای منبع، APIهای محدود، یا معماری مدل‌ها." },
            { icon: Ban, title: "استفاده انبوه غیرمجاز", body: "اسکرپینگ، استفاده بوت‌وار، یا هر روشی که بار غیرمتعارف بر سیستم وارد کند." },
            { icon: AlertTriangle, title: "محتوای آزاردهنده", body: "تولید محتوایی که به هر گروه انسانی آسیب می‌رساند یا نفرت‌پراکنی می‌کند." },
            { icon: Scale, title: "نقض حقوق ثالث", body: "استفاده از محتوای دارای حق مؤلف بدون مجوز قانونی در ورودی‌های پلتفرم." },
          ].map((s) => <DocCard key={s.title} icon={s.icon} title={s.title} body={s.body} />)}
        </div>
      </DocSection>

      <DocSection id="disclaimer" title="سلب مسئولیت">
        <p>
          Tex2Film خدمات را «همان‌طور که هست» (as-is) ارائه می‌دهد. ما تضمین نمی‌دهیم:
        </p>
        <ul className="list-none space-y-2 mt-2 mb-4">
          {[
            "خدمات بدون وقفه یا خطا در دسترس باشد.",
            "خروجی‌های AI همیشه دقیق، بی‌عیب، یا مناسب برای هدف خاصی باشند.",
            "داده‌های ذخیره‌شده در صورت رویداد غیرمنتظره بازیابی شوند.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <DocHighlight>
          مسئولیت ما در قبال هر خسارت به حداکثر مبلغی که در ۳ ماه گذشته پرداخت کرده‌اید محدود می‌شود.
        </DocHighlight>
      </DocSection>

      <DocSection id="changes" title="تغییر شرایط">
        <p>
          ما حق داریم این شرایط را در هر زمانی اصلاح کنیم. تغییرات مهم حداقل ۳۰ روز قبل از اجرا از طریق ایمیل یا اطلاعیه پلتفرم به اطلاع شما خواهد رسید. ادامه استفاده از خدمات پس از اطلاع‌رسانی به منزله پذیرش شرایط جدید است.
        </p>
      </DocSection>

      <DocSection id="contact-legal" title="تماس">
        <p>
          برای سوالات قانونی، اختلافات، یا گزارش نقض شرایط:
        </p>
        <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-5 flex items-center gap-4">
          <Mail className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">legal@tex2film.ai</p>
            <p className="text-xs text-muted-foreground mt-0.5">زمان پاسخ: حداکثر ۵ روز کاری</p>
          </div>
        </div>
      </DocSection>
    </DocsShell>
  );
}
