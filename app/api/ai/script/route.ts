import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, getTierLimits, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || "missing",
});

const STYLE_DESCRIPTIONS: Record<string, string> = {
  cinematic: "سینمایی با فضاسازی عمیق و درام",
  documentary: "مستند با روایت واقع‌گرایانه",
  commercial: "تبلیغاتی با تمرکز بر پیام برند",
  educational: "آموزشی با ساختار گام‌به‌گام",
  social: "شبکه اجتماعی با ریتم سریع و جذاب",
};

const AUDIENCE_DESCRIPTIONS: Record<string, string> = {
  general: "عموم مخاطبین",
  business: "مدیران و کسب‌وکارها",
  youth: "جوانان و نوجوانان",
  professional: "متخصصین حوزه مربوطه",
  children: "کودکان و نوجوانان",
};

const DURATION_DESCRIPTIONS: Record<string, string> = {
  short: "کوتاه (۱۵ تا ۳۰ ثانیه)",
  medium: "متوسط (۱ تا ۲ دقیقه)",
  long: "بلند (۳ تا ۵ دقیقه)",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
    console.error("[AI/script] OPENROUTER_KEY_MISSING — API key not set");
    return NextResponse.json(
      {
        error: "کلید API هوش مصنوعی تنظیم نشده است.",
        code: "OPENROUTER_KEY_MISSING",
        detail: "AI_INTEGRATIONS_OPENROUTER_API_KEY environment variable is not set",
      },
      { status: 503 }
    );
  }

  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json(
          { error: e.message, code: "UNAUTHORIZED", detail: null },
          { status: 401 }
        );
      }
      throw e;
    }

    const limits = getTierLimits(user.tier);
    const body = await request.json();
    const { idea, style, targetAudience, duration, type = "script" } = body;

    if (!idea || idea.trim().length < 5) {
      return NextResponse.json(
        { error: "ایده باید حداقل ۵ کاراکتر باشد", code: "IDEA_TOO_SHORT", detail: null },
        { status: 400 },
      );
    }

    const styleDesc = STYLE_DESCRIPTIONS[style] || style || "سینمایی";
    const audienceDesc =
      AUDIENCE_DESCRIPTIONS[targetAudience] || targetAudience || "عموم";
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

پاسخ را دقیقاً در این فرمت JSON برگردان:
{
  "logline": "متن لاگ‌لاین",
  "creativeStatement": "یک جمله کوتاه درباره رویکرد خلاقانه و بصری این پروژه"
}
فقط JSON خالص برگردان.`;

      userPrompt = `ایده: ${idea}
سبک: ${styleDesc}
مخاطب: ${audienceDesc}`;
    } else {
      systemPrompt = `تو یک فیلمنامه‌نویس و کارگردان حرفه‌ای سینما هستی. وظیفه تو نوشتن فیلمنامه کامل و حرفه‌ای به زبان فارسی است.

فیلمنامه باید شامل این بخش‌ها باشد:
۱. لاگ‌لاین (خلاصه یک‌خطی)
۲. خلاصه داستان (۲-۳ پاراگراف)
۳. سکانس‌های اصلی با جزئیات:
   - شماره و عنوان سکانس
   - توضیح صحنه (INT/EXT، مکان، زمان، شرایط نوری)
   - توصیف بصری دقیق با جهت‌گیری خلاقانه
   - دیالوگ‌ها (اگر لازم است)
   - یادداشت‌های کارگردانی و بصری
   - متادیتای بصری برای هر سکانس: زمان روز (صبح/ظهر/عصر/شب/غروب/سحر)، درجه رنگی (گرم/سرد/خنثی/اشباع‌شده/خاکستری)، و حال‌وهوای بصری (شاد/غمگین/تنش/آرام/رهام/امید/نومیدی)

قوانین:
- سبک نوشتار: ${styleDesc}
- مخاطب هدف: ${audienceDesc}
- مدت زمان تقریبی ویدیو: ${durationDesc}
- زبان: فارسی روان و حرفه‌ای
- هر سکانس باید قابل تبدیل به شات‌های مجزا باشد
- هر سکانس باید شامل یک توصیف ۲-۳ جمله‌ای از حال‌وهوای بصری و رنگی آن باشد (visual identity)
- قوس بصری را رعایت کن: سکانس‌های اولیه → میانی → پایانی باید یک تحول بصری داشته باشند
- از ایموجی استفاده نکن`;

      const userPromptBase = `ایده: ${idea}
سبک: ${styleDesc}
مخاطب هدف: ${audienceDesc}
مدت زمان: ${durationDesc}

توجه: این فیلمنامه برای تولید خودکار ویدیو با هوش مصنوعی است. هر سکانس باید یک "هویت بصری" (visual identity) داشته باشد که شامل این موارد باشد:
- زمان روز (صبح/ظهر/عصر/شب/غروب/سحر)
- درجه رنگی (گرم/سرد/خنثی/اشباع‌شده/خاکستری)
- حال‌وهوای بصری (شاد/غمگین/تنش/آرام/رهام/امید/نومیدی)
- سبک نورپردازی (طبیعی/مصنوعی/نئون/شمع/خنثی/شدید)

قوس بصری کل فیلمنامه را رعایت کن: فیلم از چه حال‌وهوایی شروع می‌شود و به چه حال‌وهوایی می‌رسد. این تحول بصری را در سکانس‌ها نشان بده.

هر سکانس را با این قالب متادیتا آغاز کن:
---
**[سکانس N]**: عنوان
**[هویت بصری]**: زمان: X | رنگ: Y | حال‌وهوا: Z | نور: W
**[شرح]**: توضیحات بصری...
---`;

      userPrompt = style === "artistic" || style === "cinematic" ? userPromptBase : `ایده: ${idea}
سبک: ${styleDesc}
مخاطب: ${audienceDesc}`;
    }

    const aiModel = limits.llmModel || "openai/gpt-4o-mini";

    console.log(`[AI/script] Starting — model: ${aiModel}, type: ${type}, idea: ${idea.slice(0, 60)}...`);

    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      ...(type === "logline"
        ? { response_format: { type: "json_object" } }
        : {}),
    });

    const durationMs = Date.now() - startTime;
    const usage = response.usage;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error(`[AI/script] No content returned — model: ${aiModel}, duration: ${durationMs}ms`);
      return NextResponse.json(
        { error: "پاسخی از هوش مصنوعی دریافت نشد", code: "NO_RESPONSE", detail: `model: ${aiModel}, durationMs: ${durationMs}` },
        { status: 500 },
      );
    }

    console.log(JSON.stringify({
      route: "AI/script",
      model: aiModel,
      type,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      durationMs,
      resultSummary: `${content.length} chars, ~${Math.round(content.split(/\s+/).length)} words`,
    }));

    if (type === "logline") {
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return NextResponse.json({
          result: content,
          type,
          model: aiModel,
          durationMs,
          tokensUsed: usage?.total_tokens ?? null,
        });
      }
      return NextResponse.json({
        result: parsed.logline || content,
        creativeStatement: parsed.creativeStatement || "",
        type,
        model: aiModel,
        durationMs,
        tokensUsed: usage?.total_tokens ?? null,
      });
    }

    return NextResponse.json({
      result: content,
      type,
      model: aiModel,
      durationMs,
      tokensUsed: usage?.total_tokens ?? null,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI/script] Error after ${durationMs}ms:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در تولید فیلمنامه",
        code: "GENERATION_ERROR",
        detail: `durationMs: ${durationMs}`,
      },
      { status: 500 },
    );
  }
}
