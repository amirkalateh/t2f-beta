import { NextRequest, NextResponse } from "next/server";
import { klingClient } from "@/lib/kling/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    const type = searchParams.get("type") || "image";
    const videoSource = searchParams.get("videoSource") || "text2video";
    const imageSource = searchParams.get("imageSource") || "generations";

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    let result;

    if (type === "image") {
      switch (imageSource) {
        case "omni-image":
          result = await klingClient.queryOmniImageTask(taskId);
          break;
        case "multi-image2image":
          result = await klingClient.queryMultiImageToImageTask(taskId);
          break;
        default:
          result = await klingClient.queryImageTask(taskId);
          break;
      }
    } else if (type === "ai-multi-shot") {
      result = await klingClient.queryAIMultiShotTask(taskId);
    } else if (type === "image-recognize") {
      result = await klingClient.queryImageRecognizeTask(taskId);
    } else if (type === "element") {
      result = await klingClient.queryElement(taskId) as any;
    } else {
      result = await klingClient.queryVideoTask(taskId, videoSource === "image2video");
    }

    const status = result.data.task_status || result.data.status;
    const isComplete = status === "succeed";
    const isFailed = status === "failed";

    let resultUrl: string | undefined;
    let images: Array<{ index: number; url: string }> | undefined;
    let videos: Array<{ id: string; url: string; duration: string }> | undefined;
    let elementId: string | undefined;
    let subjects: Array<{ segment_image: string; label: string; bbox: number[] }> | undefined;

    if (isComplete && result.data.task_result) {
      if (type === "image" && result.data.task_result.images?.length) {
        resultUrl = result.data.task_result.images[0].url;
        images = result.data.task_result.images;
      } else if (type === "video" && result.data.task_result.videos?.length) {
        resultUrl = result.data.task_result.videos[0].url;
        videos = result.data.task_result.videos;
      } else if (type === "ai-multi-shot" && result.data.task_result.images?.length) {
        images = result.data.task_result.images;
        resultUrl = result.data.task_result.images[0].url;
      } else if (type === "image-recognize") {
        subjects = result.data.task_result.subjects;
      }
    }

    if (isComplete && type === "element") {
      elementId = result.data.element_id;
    }

    return NextResponse.json({
      taskId,
      status,
      isComplete,
      isFailed,
      resultUrl,
      images,
      videos,
      elementId,
      subjects,
      message: result.data.task_status_msg,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
