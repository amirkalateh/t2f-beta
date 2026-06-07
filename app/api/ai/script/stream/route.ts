import { NextRequest } from "next/server";
import OpenAI from "openai";
import { requireAuth, getTierLimits, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const STYLE_DESCRIPTIONS: Record<string, string> = {
  cinematic: "سینمایی با فضاسازی عمیق و درام",
  documentary: "مستند با روایت واقع‌گرایانه",
  commercial: "تبلیغاتی با تمرکز بر پیام برند",
  educational: "آموزشی با ساختار گام‌به‌گام",
  social: "شبکه اجتماعی با ریتم سریع و جذاب",
};

const TARGET_PLATFORM: Record<string, string> = {
  general: "ریلز اینستاگرام",
  business: "ریلز یوتیوب",
  youth: "یوتیوب",
  professional: "سایر پلتفرمها",
};

const DURATION_DESCRIPTIONS: Record<string, string> = {
  short: "کوتاه (۱۵ تا ۳۰ ثانیه)",
  medium: "متوسط (۱ تا ۲ دقیقه)",
  long: "بلند (۳ تا ۵ دقیقه)",
};

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    const limits = getTierLimits(user.tier);
    const body = await request.json();
    const {
      idea,
      style,
      targetplatform,
      targetAudience,
      duration,
      type = "script",
      logline,
    } = body;
    const audienceParam = targetAudience || targetplatform;

    if (!idea || idea.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "ایده باید حداقل ۵ کاراکتر باشد" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const styleDesc = STYLE_DESCRIPTIONS[style] || style || "سینمایی";
    const audienceDesc =
      TARGET_PLATFORM[audienceParam] || audienceParam || "ریلز اینستاگرام";
    const durationDesc = DURATION_DESCRIPTIONS[duration] || duration || "متوسط";

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "logline") {
      systemPrompt = `تو یک فیلمنامه‌نویس و کارگردان برجسته سینما هستی. وظیفه تو نوشتن یک لاگ‌لاین (خلاصه یک‌خطی داستان) حرفه‌ای و جذاب به زبان فارسی است.

لاگ‌لاین باید:
- دقیقاً ۱ تا ۲ جمله باشد
- شخصیت اصلی، هدف، و مانع/تعارض اصلی را مشخص کند
- حس کنجکاوی و تنش دراماتیک ایجاد کند
- قابلیت تبدیل به تصاویر بصری قوی داشته باشد

فقط متن لاگ‌لاین را بنویس. هیچ توضیح اضافی ننویس.`;

      userPrompt = `ایده: ${idea}
سبک: ${styleDesc}
مخاطب: ${audienceDesc}`;
    } else if (type === "refineIdea") {
      systemPrompt = `تو یک فیلمنامه‌نویس و کارگردان برجسته سینما هستی. وظیفه تو بازنویسی و پالایش اطلاعات اولیه کاربر به یک ایده فیلم‌سازی حرفه‌ای، جذاب و خوانا است.

قوانین:
- ۳ تا ۴ خط فارسی روان و حرفه‌ای
- عنوان را در یک خط جداگانه در ابتدا بیاور (با پیشوند "عنوان: ")
- ایده را در یک پاراگراف کوتاه و متمرکز بنویس
- سبک و تم را در یک خط جداگانه در انتها بیاور
- حس کنجکاوی و دید بصری قوی منتقل شود
- فقط متن ایده را بنویس — هیچ توضیح اضافی، مقدمه یا پایان‌بندی ننویس
- از ایموجی استفاده نکن`;

      userPrompt = `اطلاعات اولیه پروژه:
${idea}

سبک: ${styleDesc}
مخاطب: ${audienceDesc}
مدت زمان: ${durationDesc}`;
    } else {
      systemPrompt = `تو یک فیلمنامه‌نویس و کارگردان حرفه‌ای سینما هستی. وظیفه تو نوشتن فیلمنامه کامل و حرفه‌ای به زبان فارسی است.

فیلمنامه باید شامل این بخش‌ها باشد:
۱. لاگ‌لاین (خلاصه یک‌خطی)
۲. خلاصه داستان (۲-۳ پاراگراف)
۳. سکانس‌های اصلی با جزئیات:
   - شماره و عنوان سکانس
   - توضیح صحنه (INT/EXT, مکان, زمان)
   - توصیف بصری دقیق
   - دیالوگ‌ها (اگر لازم است)
   - یادداشت‌های کارگردانی

قوانین:
- سبک نوشتار: ${styleDesc}

- پلتفرم هدف: ${audienceDesc}  
توضیحات: پلتفرم هدف مثلا ریلز اینستاگرام. که در این صورت تصاویر باید عمودی باشند!

- مدت زمان تقریبی ویدیو: ${durationDesc}
- زبان: فارسی روان و حرفه‌ای

- هر سکانس باید قابل تبدیل به شات‌های مجزا باشد
- از ایموجی استفاده نکن`;

      userPrompt = `بر اساس ایده زیر، یک فیلمنامه کامل و حرفه‌ای بنویس:

ایده: ${idea}${logline ? `\nلاگ‌لاین: ${logline}` : ""}`;
    }

    const aiModel = limits.llmModel || "openai/gpt-4.1-mini";
    const stream = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: type === "logline" ? 256 : type === "refineIdea" ? 512 : 4096,
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ token: content })}\n\n`,
                ),
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
          );
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Script stream error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "خطا در تولید فیلمنامه",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
