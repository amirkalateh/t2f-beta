import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth, getTierLimits, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  visionShots,
  narratives,
  visionBoards,
  assets,
  projects,
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

interface ToolResult {
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
}

function extractBalancedJsonObjects(text: string): any[] {
  const results: any[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "{") {
      let depth = 0;
      let j = i;
      let inString = false;
      let escape = false;
      while (j < text.length) {
        const ch = text[j];
        if (escape) {
          escape = false;
          j++;
          continue;
        }
        if (ch === "\\" && inString) {
          escape = true;
          j++;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          j++;
          continue;
        }
        if (inString) {
          j++;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            try {
              const parsed = JSON.parse(text.slice(i, j + 1));
              results.push(parsed);
            } catch {}
            break;
          }
        }
        j++;
      }
      i = j + 1;
    } else {
      i++;
    }
  }
  return results;
}

function parseToolCalls(content: string): Array<{ tool: string; params: any }> {
  const toolCalls: Array<{ tool: string; params: any }> = [];
  const seen = new Set<string>();

  function tryAdd(obj: any) {
    if (obj && typeof obj.tool === "string") {
      const key = JSON.stringify({ tool: obj.tool, params: obj.params });
      if (!seen.has(key)) {
        seen.add(key);
        toolCalls.push({ tool: obj.tool, params: obj.params || {} });
      }
    }
    if (obj && obj.action === "generate_image" && obj.prompt) {
      const tc = {
        tool: "generate_image",
        params: {
          prompt: obj.prompt,
          aspect_ratio: obj.aspect_ratio || "16:9",
        },
      };
      const key = JSON.stringify(tc);
      if (!seen.has(key)) {
        seen.add(key);
        toolCalls.push(tc);
      }
    }
  }

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let fenceMatch;
  while ((fenceMatch = fenceRegex.exec(content)) !== null) {
    const raw = fenceMatch[1].trim();
    try {
      tryAdd(JSON.parse(raw));
    } catch {}
    for (const obj of extractBalancedJsonObjects(raw)) tryAdd(obj);
  }

  if (toolCalls.length === 0) {
    for (const obj of extractBalancedJsonObjects(content)) tryAdd(obj);
  }

  return toolCalls;
}

function cleanContentFromToolCalls(content: string): string {
  return content
    .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
    .replace(/\{[^{}]*"tool"\s*:\s*"[^"]+?"[^{}]*\}/g, "")
    .replace(/\{[^{}]*"action"\s*:\s*"generate_image"[^{}]*\}/g, "")
    .trim();
}

async function verifyProjectOwnership(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project || null;
}

async function executeToolCall(
  toolCall: { tool: string; params: any },
  projectId: number,
  userId: string,
): Promise<ToolResult> {
  const { tool, params } = toolCall;

  try {
    switch (tool) {
      case "generate_image": {
        return {
          tool: "generate_image",
          success: true,
          data: {
            prompt: params.prompt,
            aspectRatio: params.aspect_ratio || "16:9",
            titleFa: params.title_fa || "تصویر تولید شده",
            resolution: "1k",
            model: "kling-v2",
          },
        };
      }

      case "add_shots": {
        const shotsToAdd = params.shots || [];
        if (!Array.isArray(shotsToAdd) || shotsToAdd.length === 0) {
          return { tool, success: false, error: "No shots provided" };
        }

        const existingShots = await db
          .select()
          .from(visionShots)
          .where(eq(visionShots.projectId, projectId))
          .orderBy(asc(visionShots.order));

        let insertOrder = existingShots.length;

        if (params.insertAfterShotId) {
          const afterShot = existingShots.find(
            (s) => s.id === params.insertAfterShotId,
          );
          if (afterShot !== undefined) {
            insertOrder = afterShot.order + 1;
            const shotsToShift = existingShots.filter(
              (s) => s.order >= insertOrder,
            );
            for (const s of shotsToShift) {
              await db
                .update(visionShots)
                .set({ order: s.order + shotsToAdd.length })
                .where(eq(visionShots.id, s.id));
            }
          }
        }

        const createdShots = [];
        for (let i = 0; i < shotsToAdd.length; i++) {
          const s = shotsToAdd[i];
          const [shot] = await db
            .insert(visionShots)
            .values({
              projectId,
              title: s.title || `شات ${insertOrder + i + 1}`,
              description: s.description || "",
              prompt: s.prompt || s.description || "",
              order: insertOrder + i,
              shotType: s.shotType || "medium",
              cameraAngle: s.cameraAngle || "eye_level",
              cameraMovement: s.cameraMovement || "static",
              keyLight: s.keyLight || "natural",
              colorGrade: s.colorGrade || null,
              cameraModel: s.cameraModel || null,
              lensType: s.lensType || null,
              focalLength: s.focalLength || null,
              cinemaAspectRatio: s.cinemaAspectRatio || null,
              duration: s.duration || 3,
              dialogueText: s.dialogueText || "",
              notes: s.notes || "",
              sceneNumber: s.sceneNumber || null,
              sceneName: s.sceneName || null,
              status: "draft",
            })
            .returning();
          createdShots.push(shot);
        }

        return {
          tool,
          success: true,
          data: {
            count: createdShots.length,
            shots: createdShots.map((s) => ({
              id: s.id,
              title: s.title,
              order: s.order,
            })),
          },
        };
      }

      case "update_shot": {
        const shotId = params.shotId;
        if (!shotId) {
          return { tool, success: false, error: "shotId is required" };
        }

        const allowedShotFields = [
          "title",
          "description",
          "prompt",
          "shotType",
          "cameraAngle",
          "cameraMovement",
          "keyLight",
          "duration",
          "dialogueText",
          "notes",
          "sceneNumber",
          "sceneName",
          "order",
          "colorGrade",
          "cameraModel",
          "lensType",
          "focalLength",
          "cinemaAspectRatio",
        ];
        const updates: Record<string, any> = {};
        for (const key of allowedShotFields) {
          if (params[key] !== undefined) updates[key] = params[key];
        }
        if (Object.keys(updates).length === 0) {
          return { tool, success: false, error: "No valid fields to update" };
        }

        const [updated] = await db
          .update(visionShots)
          .set({ ...updates, updatedAt: new Date() })
          .where(
            and(
              eq(visionShots.id, shotId),
              eq(visionShots.projectId, projectId),
            ),
          )
          .returning();

        if (!updated) {
          return { tool, success: false, error: `Shot #${shotId} not found` };
        }

        return {
          tool,
          success: true,
          data: {
            shotId: updated.id,
            title: updated.title,
            updatedFields: Object.keys(updates),
          },
        };
      }

      case "delete_shot": {
        const shotId = params.shotId;
        if (!shotId) {
          return { tool, success: false, error: "shotId is required" };
        }

        const [deleted] = await db
          .delete(visionShots)
          .where(
            and(
              eq(visionShots.id, shotId),
              eq(visionShots.projectId, projectId),
            ),
          )
          .returning();

        if (!deleted) {
          return {
            tool,
            success: false,
            error: `Shot #${shotId} not found in this project`,
          };
        }

        return {
          tool,
          success: true,
          data: { shotId: deleted.id, title: deleted.title },
        };
      }

      case "update_director_brief": {
        const [vb] = await db
          .select()
          .from(visionBoards)
          .where(eq(visionBoards.projectId, projectId));

        if (!vb) {
          return { tool, success: false, error: "Vision board not found" };
        }

        const allowedBriefFields = [
          "filmStyle",
          "filmTexture",
          "colorScience",
          "lightingPhilosophy",
          "overallMood",
          "referenceFilms",
          "era",
          "visualStyle",
          "cameraBody",
          "lensFamily",
          "baseAspectRatio",
        ];
        const briefUpdates: Record<string, any> = {};
        for (const key of allowedBriefFields) {
          if (params[key] !== undefined) briefUpdates[key] = params[key];
        }
        const currentBrief = (vb.directorBrief as Record<string, any>) || {};
        const newBrief = { ...currentBrief, ...briefUpdates };

        const [updated] = await db
          .update(visionBoards)
          .set({ directorBrief: newBrief })
          .where(eq(visionBoards.projectId, projectId))
          .returning();

        return {
          tool,
          success: true,
          data: { updatedFields: Object.keys(params) },
        };
      }

      case "generate_storyboard": {
        const [narr] = await db
          .select()
          .from(narratives)
          .where(eq(narratives.projectId, projectId));

        if (!narr?.script || narr.script.trim().length < 20) {
          return {
            tool,
            success: false,
            error:
              "فیلمنامه‌ای برای تولید استوری‌بورد یافت نشد. ابتدا فیلمنامه را در بخش روایت بنویسید.",
          };
        }

        const [proj] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId));

        const aspectRatio = proj?.aspectRatio || "16:9";
        const shotCountTarget = params.shotCount
          ? ` (تعداد شات: دقیقاً ${params.shotCount})`
          : "";

        const storyboardSystemPrompt = `You are a world-class cinematographer. Break down a Persian screenplay into a professional, animation-ready shot list.
Return ONLY valid JSON with this exact structure:
{
  "shots": [
    {
      "title": "عنوان فارسی کوتاه",
      "description": "توصیف بصری کامل به فارسی",
      "prompt": "Detailed English image-generation prompt, 60-100 words. Must include: shot size, subject/action, location details, lighting direction and quality, color palette, camera body, lens focal length, mood, film texture, aspect ratio",
      "sceneNumber": 1,
      "sceneName": "نام صحنه فارسی",
      "shotType": "establishing|wide|medium|close_up|extreme_close_up|insert|cutaway|over_shoulder|two_shot",
      "cameraAngle": "eye_level|low_angle|high_angle|dutch|pov",
      "cameraMovement": "static|dolly_in|dolly_out|pan|tilt|handheld|steadicam|crane|push_in|pull_out",
      "keyLight": "natural|golden_hour|low_key|high_key|hard_dramatic|soft_diffused|neon|chiaroscuro|blue_hour",
      "colorGrade": "Descriptive English color grade e.g. warm desaturated film look",
      "cameraModel": "arri_alexa_mini_lf|arri_alexa_35|red_v_raptor|sony_venice_2",
      "lensType": "spherical|anamorphic|vintage_anamorphic",
      "focalLength": "18mm|24mm|35mm|50mm|65mm|85mm|100mm",
      "cinemaAspectRatio": "${aspectRatio}",
      "duration": 4,
      "dialogueText": "دیالوگ اگر وجود دارد",
      "transitionFromPrev": "cut|dissolve|match_cut|fade"
    }
  ]
}

Rules:
- Each scene: establish → medium → close → insert/cutaway coverage
- Consistent colorGrade within each scene
- ALL shots in the same scene use the SAME cameraModel and lensType
- Vary shotType, cameraAngle, cameraMovement per shot
- English prompts must describe raccord: same wardrobe, lighting direction, environment details
- Duration: establishing=4-6s, medium=3-5s, close-up=2-3s, insert=2s
- Return ONLY the JSON, no markdown`;

        const sbResp = await openrouter.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: storyboardSystemPrompt },
            {
              role: "user",
              content: `این فیلمنامه فارسی را به شات‌لیست سینمایی حرفه‌ای تبدیل کن.${shotCountTarget}\n\nفیلمنامه:\n${narr.script.slice(0, 6000)}`,
            },
          ],
          max_tokens: 8192,
          temperature: 0.09,
          response_format: { type: "json_object" },
        });

        const sbContent = sbResp.choices[0]?.message?.content;
        if (!sbContent) {
          return {
            tool,
            success: false,
            error: "پاسخی از هوش مصنوعی دریافت نشد",
          };
        }

        let sbParsed: any;
        try {
          sbParsed = JSON.parse(sbContent);
        } catch {
          const match = sbContent.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              sbParsed = JSON.parse(match[0]);
            } catch {
              return {
                tool,
                success: false,
                error: "خطا در پردازش پاسخ هوش مصنوعی",
              };
            }
          } else {
            return {
              tool,
              success: false,
              error: "خطا در پردازش پاسخ هوش مصنوعی",
            };
          }
        }

        const sbShots: any[] = sbParsed.shots || [];
        if (sbShots.length === 0) {
          return { tool, success: false, error: "هوش مصنوعی شاتی تولید نکرد" };
        }

        const existingForOrder = await db
          .select()
          .from(visionShots)
          .where(eq(visionShots.projectId, projectId))
          .orderBy(asc(visionShots.order));

        const startOrder = existingForOrder.length;
        const createdShots: Array<{ id: number; title: string }> = [];

        for (let i = 0; i < sbShots.length; i++) {
          const s = sbShots[i];
          const [shot] = await db
            .insert(visionShots)
            .values({
              projectId,
              title: s.title || `شات ${startOrder + i + 1}`,
              description: s.description || "",
              prompt: s.prompt || s.description || "",
              order: startOrder + i,
              shotType: s.shotType || "medium",
              cameraAngle: s.cameraAngle || "eye_level",
              cameraMovement: s.cameraMovement || "static",
              keyLight: s.keyLight || "natural",
              colorGrade: s.colorGrade || null,
              cameraModel: s.cameraModel || null,
              lensType: s.lensType || null,
              focalLength: s.focalLength || null,
              cinemaAspectRatio: s.cinemaAspectRatio || null,
              duration:
                typeof s.duration === "number"
                  ? s.duration
                  : parseInt(s.duration) || 3,
              dialogueText: s.dialogueText || "",
              notes: s.raccordNotes || s.notes || "",
              sceneNumber: s.sceneNumber || null,
              sceneName: s.sceneName || null,
              status: "draft",
            })
            .returning();
          createdShots.push({ id: shot.id, title: shot.title });
        }

        return {
          tool,
          success: true,
          data: {
            count: createdShots.length,
            shots: createdShots.slice(0, 8),
          },
        };
      }

      case "update_narrative": {
        const shouldAppend = params.append !== false;

        const [existing] = await db
          .select()
          .from(narratives)
          .where(eq(narratives.projectId, projectId));

        if (!existing) {
          return { tool, success: false, error: "Narrative not found" };
        }

        const updates: Record<string, any> = {};

        if (params.idea !== undefined) {
          updates.idea =
            shouldAppend && existing.idea
              ? `${existing.idea}\n\n${params.idea}`
              : params.idea;
        }
        if (params.logline !== undefined) {
          updates.logline =
            shouldAppend && existing.logline
              ? `${existing.logline}\n\n${params.logline}`
              : params.logline;
        }
        if (params.script !== undefined) {
          updates.script =
            shouldAppend && existing.script
              ? `${existing.script}\n\n${params.script}`
              : params.script;
        }

        if (Object.keys(updates).length === 0) {
          return {
            tool,
            success: false,
            error: "No narrative fields to update",
          };
        }

        const [updated] = await db
          .update(narratives)
          .set(updates)
          .where(eq(narratives.projectId, projectId))
          .returning();

        if (!updated) {
          return { tool, success: false, error: "Narrative update failed" };
        }

        return {
          tool,
          success: true,
          data: {
            updatedFields: Object.keys(updates),
            mode: shouldAppend ? "appended" : "replaced",
          },
        };
      }

      case "create_element": {
        if (!params.name || !params.type) {
          return { tool, success: false, error: "name and type are required" };
        }

        const [asset] = await db
          .insert(assets)
          .values({
            projectId,
            userId,
            name: params.name,
            type: params.type,
            description: params.description || "",
            source: "omni",
          })
          .returning();

        return {
          tool,
          success: true,
          data: { id: asset.id, name: asset.name, type: asset.type },
        };
      }

      case "answer": {
        return { tool, success: true, data: { text: params.text || "" } };
      }

      default:
        return { tool, success: false, error: `Unknown tool: ${tool}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${tool}):`, error);
    return {
      tool,
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

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
    const body = await request.json();
    const { messages, projectState, projectId, currentStage } = body as {
      messages: any[];
      projectState?: string;
      projectId?: string;
      currentStage?: string;
      elements?: any[];
      projectContext?: any;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "پیام‌ها الزامی است" },
        { status: 400 },
      );
    }

    const systemPrompt = projectState
      ? buildSystemPrompt({
          serializedState: projectState,
          currentStage: (currentStage as any) || "vision",
        })
      : buildSystemPrompt({
          serializedState: "No project state available.",
          currentStage: (currentStage as any) || "vision",
        });

    const aiModel = limits.llmModel || "openai/gpt-4o-mini";

    const response = await openrouter.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => {
          if (m.attachedImages && m.attachedImages.length > 0) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content || "Analyze this image" },
                ...m.attachedImages.map((img: string) => ({
                  type: "image_url",
                  image_url: { url: img },
                })),
              ],
            };
          }
          return { role: m.role, content: m.content };
        }),
      ],
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "پاسخی دریافت نشد" }, { status: 500 });
    }

    const toolCalls = parseToolCalls(content);
    const cleanContent = cleanContentFromToolCalls(content);

    const toolResults: ToolResult[] = [];
    let imageRequest = null;

    if (toolCalls.length > 0 && projectId) {
      const numericProjectId = parseInt(projectId);
      const project = await verifyProjectOwnership(numericProjectId, user.id);

      if (project) {
        for (const tc of toolCalls) {
          const result = await executeToolCall(tc, numericProjectId, user.id);
          toolResults.push(result);

          if (tc.tool === "generate_image" && result.success && result.data) {
            imageRequest = {
              prompt: result.data.prompt,
              aspectRatio: result.data.aspectRatio || "16:9",
              titleFa: result.data.titleFa || "تصویر تولید شده",
            };
          }
        }
      }
    }

    return NextResponse.json({
      message: cleanContent || "عملیات انجام شد.",
      imageRequest,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      model: aiModel,
    });
  } catch (error) {
    console.error("Omni AI error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در پردازش درخواست",
      },
      { status: 500 },
    );
  }
}
