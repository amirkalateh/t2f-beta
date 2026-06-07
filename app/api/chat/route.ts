import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;
//amir is here
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
});

const SYSTEM_PROMPT = `You are the Tex2Film Art Consultant - an expert AI assistant specialized in video production, cinematography, and visual storytelling. You help users create professional-quality videos using the Tex2Film platform (powered by FX AI).

Your expertise includes:
- Prompt engineering for AI image and video generation
- Cinematography techniques (shot types, camera movements, lighting)
- Visual storytelling and narrative structure
- Color grading and mood creation
- Storyboard planning and scene composition

Always respond in Persian (Farsi). Be concise but helpful. When suggesting prompts, make them detailed and cinematic.

Context about the current user session will be provided. Use this context to give more relevant suggestions.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body as { messages: Message[]; context?: Record<string, string> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    let systemMessage = SYSTEM_PROMPT;
    if (context) {
      systemMessage += `\n\nCurrent context:
- Section: ${context.section || "unknown"}
- Project: ${context.projectTitle || "Untitled"}
- Active Tab: ${context.activeTab || "unknown"}`;
    }

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-4-maverick",
      messages: [
        { role: "system", content: systemMessage },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || "متاسفانه نتوانستم پاسخی تولید کنم.";

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Chat error:", error);
    
    if (error instanceof Error && error.message.includes("rate limit")) {
      return NextResponse.json(
        { error: "لطفا کمی صبر کنید و دوباره تلاش کنید." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
