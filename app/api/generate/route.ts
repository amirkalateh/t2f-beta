import { NextRequest, NextResponse } from "next/server";
import { klingClient, type ImageReferenceType, type ImageResolution, stripBase64Prefix } from "@/lib/kling/client";
import { optimizePrompt, KLING_MAX_PROMPT_CHARS } from "@/lib/kling/prompt-optimizer";
import { checkFeatureFlag } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      model,
      prompt: rawPrompt,
      negativePrompt,
      aspectRatio,
      duration,
      referenceImageUrl,
      referenceImages,
      imageReference,
      imageFidelity,
      humanFidelity,
      resolution,
      n,
      count,
      elementIds,
      subjectImageUrls,
      sceneImageUrl,
      styleImageUrl,
    } = body;

    if (!rawPrompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const prompt = rawPrompt.length > KLING_MAX_PROMPT_CHARS
      ? await optimizePrompt(rawPrompt)
      : rawPrompt;

    const elementList = elementIds && Array.isArray(elementIds) && elementIds.length > 0
      ? elementIds.map((id: string) => ({ element_id: id }))
      : undefined;

    if (mode === "image") {
      const imgEnabled = await checkFeatureFlag("kling_image");
      if (!imgEnabled) {
        return NextResponse.json({ error: "این قابلیت در حال حاضر غیرفعال است" }, { status: 503 });
      }
      const isOmni = klingClient.isOmniModel(model);

      if (isOmni) {
        const omniResolution: ImageResolution = "1k";

        const imageList: Array<{ image: string }> = [];
        if (referenceImages && Array.isArray(referenceImages)) {
          for (const url of referenceImages) {
            if (typeof url === "string" && url.trim()) {
              imageList.push({ image: url.startsWith("data:") ? stripBase64Prefix(url) : url });
            }
          }
        } else if (referenceImageUrl && typeof referenceImageUrl === "string") {
          imageList.push({
            image: referenceImageUrl.startsWith("data:")
              ? stripBase64Prefix(referenceImageUrl)
              : referenceImageUrl,
          });
        }

        const fidelity = imageFidelity !== undefined ? Math.max(0, Math.min(1, Number(imageFidelity))) : undefined;

        const hFidelityOmni = humanFidelity !== undefined ? Math.max(0, Math.min(1, Number(humanFidelity))) : undefined;

        const omniModelName = model === "kling-image-o1" ? "kling-image-o1" : "kling-v3-omni";
        const result = await klingClient.createOmniImageTask({
          model_name: omniModelName,
          prompt,
          negative_prompt: negativePrompt || undefined,
          aspect_ratio: aspectRatio || "16:9",
          resolution: omniResolution,
          image_list: imageList.length > 0 ? imageList : undefined,
          element_list: elementList,
          image_fidelity: imageList.length > 0 ? fidelity : undefined,
          human_fidelity: imageList.length > 0 ? hFidelityOmni : undefined,
          n: count || n || 1,
        });

        return NextResponse.json({
          taskId: result.data.task_id,
          status: result.data.task_status,
          type: "image",
          model: omniModelName,
          imageSource: "omni-image",
        });
      }

      if (subjectImageUrls && Array.isArray(subjectImageUrls) && subjectImageUrls.length > 0) {
        console.log(`[Generate] Multi-Image-to-Image path: ${subjectImageUrls.length} subject images, sceneImage=${!!sceneImageUrl}, model=${model}`);
        const subjectList = subjectImageUrls
          .filter((u: string) => typeof u === "string" && u.trim())
          .slice(0, 4)
          .map((u: string) => ({ subject_image: u.startsWith("data:") ? stripBase64Prefix(u) : u }));

        const multiModelMapping: Record<string, string> = {
          "kling-v2-1": "kling-v2-1",
          "kling-v2": "kling-v2",
        };
        const multiModel = multiModelMapping[model] || "kling-v2-1";

        const result = await klingClient.createMultiImageToImageTask({
          model_name: multiModel,
          prompt,
          negative_prompt: negativePrompt || undefined,
          subject_image_list: subjectList,
          scene_image: sceneImageUrl || undefined,
          style_image: styleImageUrl || undefined,
          aspect_ratio: aspectRatio || "16:9",
          n: n || 1,
        });

        return NextResponse.json({
          taskId: result.data.task_id,
          status: result.data.task_status,
          type: "image",
          model: model || "multi-image2image",
          imageSource: "multi-image2image",
        });
      }

      {
        const klingAspectRatio = aspectRatio || "16:9";
        const modelMapping: Record<string, string> = {
          "kling-v3": "kling-v3",
          "kling-v2-1": "kling-v2-1",
          "kling-v2": "kling-v2",
          "kling-v1-5": "kling-v1-5",
          "kling-v1": "kling-v1",
        };
        const klingModel = modelMapping[model] || "kling-v2";

        const klingResolution: ImageResolution = "1k";

        const validRefTypes: ImageReferenceType[] = ["subject", "face"];
        const validatedRefType = validRefTypes.includes(imageReference) ? imageReference as ImageReferenceType : undefined;

        const fidelity = imageFidelity !== undefined ? Math.max(0, Math.min(1, Number(imageFidelity))) : undefined;
        const hFidelity = humanFidelity !== undefined ? Math.max(0, Math.min(1, Number(humanFidelity))) : undefined;

        let imageData = referenceImageUrl && validatedRefType ? referenceImageUrl : undefined;
        if (imageData && imageData.startsWith("data:")) {
          imageData = stripBase64Prefix(imageData);
        }

        const result = await klingClient.createImageTask({
          model_name: klingModel,
          prompt,
          negative_prompt: negativePrompt || undefined,
          aspect_ratio: klingAspectRatio,
          n: n || 1,
          resolution: klingResolution,
          image: imageData,
          image_reference: validatedRefType,
          image_fidelity: fidelity,
          human_fidelity: validatedRefType === "face" ? hFidelity : undefined,
          ref_images: referenceImageUrl && !validatedRefType ? [{ url: referenceImageUrl }] : undefined,
          element_list: elementList,
        });

        return NextResponse.json({
          taskId: result.data.task_id,
          status: result.data.task_status,
          type: "image",
          model: klingModel,
          imageSource: "generations",
        });
      }
    } else {
      const vidEnabled = await checkFeatureFlag("kling_video");
      if (!vidEnabled) {
        return NextResponse.json({ error: "این قابلیت در حال حاضر غیرفعال است" }, { status: 503 });
      }
      const videoModelMapping: Record<string, string> = {
        "kling-v2-6-pro": "kling-v2-6",
        "kling-v2-6-std": "kling-v2-6",
        "kling-v2-5-turbo-pro": "kling-v2-5-turbo",
        "kling-v2-5-turbo-std": "kling-v2-5-turbo",
        "kling-v2-1-pro": "kling-v2-1",
        "kling-v2-1-std": "kling-v2-1",
        "kling-v2-master": "kling-v2-master",
        "kling-v1-6-pro": "kling-v1-6",
        "kling-v1-6-std": "kling-v1-6",
        "kling-v1-5-pro": "kling-v1-5",
        "kling-v1-5-std": "kling-v1-5",
        "kling-v1-pro": "kling-v1",
        "kling-v1-std": "kling-v1",
      };

      const klingModel = videoModelMapping[model] || "kling-v1";
      const videoMode = model?.includes("pro") || model?.includes("master") ? "pro" : "std";

      let videoImageUrl = referenceImageUrl;
      if (videoImageUrl && videoImageUrl.startsWith("data:")) {
        videoImageUrl = stripBase64Prefix(videoImageUrl);
      }

      const result = await klingClient.createVideoTask({
        model_name: klingModel,
        prompt,
        negative_prompt: negativePrompt || undefined,
        aspect_ratio: aspectRatio || "16:9",
        duration: duration === "10s" || duration === "10" || duration === 10 ? "10" : "5",
        mode: videoMode,
        image_url: videoImageUrl,
        element_list: elementList,
      });

      return NextResponse.json({
        taskId: result.data.task_id,
        status: result.data.task_status,
        type: "video",
        model: klingModel,
      });
    }
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
