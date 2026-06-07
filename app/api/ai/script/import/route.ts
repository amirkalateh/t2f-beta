import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, getTierLimits, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const STYLE_DESCRIPTIONS: Record<string, string> = {
  cinematic: "سینمایی با فضاسازی عمیق و درام",
  documentary: "مستند با روایت واقع‌گرایانه",
  commercial: "تبلیغاتی با تمرکز بر پیام برند",
  educational: "آموزشی با ساختار گام‌به‌گام",
  social: "شبکه اجتماعی با ریتم سریع و جذاب",
};

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const limits = getTierLimits(user.tier);
    let rawText = "";
    let style = "cinematic";
    let targetAudience = "general";
    let duration = "medium";
    let idea = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      style = (formData.get("style") as string) || style;
      targetAudience = (formData.get("targetAudience") as string) || targetAudience;
      duration = (formData.get("duration") as string) || duration;
      idea = (formData.get("idea") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "فایلی انتخاب نشده" }, { status: 400 });
      }

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        rawText = extractTextFromPdfBuffer(buffer);
        if (rawText.trim().length < 20) {
          return NextResponse.json(
            { error: "متن PDF قابل استخراج نیست. لطفاً فایل متنی (txt یا md) استفاده کنید." },
            { status: 400 }
          );
        }
      } else {
        rawText = await file.text();
      }
    } else {
      const body = await request.json();
      rawText = body.rawText || "";
      style = body.style || style;
      targetAudience = body.targetAudience || targetAudience;
      duration = body.duration || duration;
      idea = body.idea || "";
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "متن فایل خیلی کوتاه یا ناخوانا است. لطفاً فایل متنی (txt یا md) استفاده کنید." },
        { status: 400 }
      );
    }

    const estimatedPages = Math.ceil(rawText.length / 2500);
    if (estimatedPages > 20) {
      rawText = rawText.substring(0, 50000);
    }

    if (rawText.length > 50000) {
      rawText = rawText.substring(0, 50000);
    }

    const styleDesc = STYLE_DESCRIPTIONS[style] || style;

    const aiModel = limits.llmModel || "openai/gpt-4o-mini";
    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `تو یک فیلمنامه‌نویس و ویراستار حرفه‌ای سینما هستی. کاربر یک فیلمنامه یا متن روایی موجود را وارد کرده است. وظیفه تو:

۱. متن را بخوان و تحلیل کن
۲. آن را در قالب فیلمنامه حرفه‌ای فارسی بازنویسی کن
۳. ساختار صحنه‌ها، دیالوگ‌ها و یادداشت‌های کارگردانی را اصلاح کن
۴. سبک مورد نظر (${styleDesc}) را رعایت کن
۵. یک لاگ‌لاین (خلاصه یک‌خطی) و یک ایده خلاصه استخراج کن

قوانین:
- اگر متن به زبان دیگری است، آن را به فارسی ترجمه و بازنویسی کن
- ساختار فیلمنامه را حرفه‌ای کن (سکانس‌بندی، صحنه‌ها، دیالوگ‌ها)
- داستان اصلی را حفظ کن ولی کیفیت نوشتار را ارتقا بده
- از ایموجی استفاده نکن

پاسخ را در قالب JSON زیر برگردان:
{
  "script": "فیلمنامه کامل بازنویسی شده",
  "logline": "خلاصه یک‌خطی داستان",
  "idea": "خلاصه ایده اصلی در ۲-۳ جمله"
}
فقط JSON خالص برگردان.`,
        },
        {
          role: "user",
          content: `${idea ? `ایده اصلی کاربر: ${idea}\n\n` : ""}متن وارد شده برای بازنویسی به فیلمنامه:\n\n${rawText}`,
        },
      ],
      max_tokens: 8192,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "پاسخی از هوش مصنوعی دریافت نشد" }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({
        script: content,
        logline: "",
        idea: "",
      });
    }

    return NextResponse.json({
      script: parsed.script || content,
      logline: parsed.logline || "",
      idea: parsed.idea || "",
    });
  } catch (error) {
    console.error("Script import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در پردازش فیلمنامه" },
      { status: 500 }
    );
  }
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const content = buffer.toString("utf-8");
    const textChunks: string[] = [];

    const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/g;
    let match;
    while ((match = streamRegex.exec(content)) !== null) {
      const streamContent = match[1];
      const textRegex = /\(([^)]*)\)/g;
      let textMatch;
      while ((textMatch = textRegex.exec(streamContent)) !== null) {
        textChunks.push(textMatch[1]);
      }

      const tjRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(tjMatch[1])) !== null) {
          textChunks.push(innerMatch[1]);
        }
      }
    }

    if (textChunks.length > 0) {
      return textChunks.join(" ").replace(/\s+/g, " ").trim();
    }

    const printable = content.replace(/[^\x20-\x7E\u0600-\u06FF\n]/g, " ");
    return printable.replace(/\s+/g, " ").trim().substring(0, 50000);
  } catch {
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\u0600-\u06FF\n]/g, " ").trim();
  }
}
