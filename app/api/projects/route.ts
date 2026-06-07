import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, narratives, visionBoards, assemblies, visionShots } from "@shared/schema";
import { desc, eq, asc } from "drizzle-orm";
import { getAuthenticatedUser, getTierLimits, getUserProjectCount, checkLimit } from "@/lib/auth";


export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری شوید" },
        { status: 401 }
      );
    }

    const allProjects = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        title: projects.title,
        description: projects.description,
        creativeIntent: projects.creativeIntent,
        style: projects.style,
        tone: projects.tone,
        aspectRatio: projects.aspectRatio,
        currentStage: projects.currentStage,
        thumbnailUrl: projects.thumbnailUrl,
        progress: projects.progress,
        updatedAt: projects.updatedAt,
        firstShotImage: visionShots.generatedImageUrl,
      })
      .from(projects)
      .leftJoin(visionShots, eq(projects.id, visionShots.projectId))
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt), asc(visionShots.order))
      .then(rows => {
        const projectMap = new Map();
        rows.forEach(row => {
          if (!projectMap.has(row.id)) {
            const { firstShotImage, ...projectData } = row;
            projectMap.set(row.id, {
              ...projectData,
              thumbnailUrl: projectData.thumbnailUrl || firstShotImage
            });
          }
        });
        return Array.from(projectMap.values());
      });
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً وارد حساب کاربری شوید" },
        { status: 401 }
      );
    }

    const limits = getTierLimits(user.tier);
    const projectCount = await getUserProjectCount(user.id);
    if (!checkLimit(projectCount, limits.maxProjects)) {
      return NextResponse.json(
        { error: `شما به حداکثر تعداد پروژه (${limits.maxProjects}) در پلن ${limits.label} رسیده‌اید. برای ساخت پروژه بیشتر، پلن خود را ارتقا دهید.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    // Remove style from body — project templates no longer pre-seed content
    const { style, aspectRatio, targetAudience, duration, ...projectBody } = body;

    const project = await db.transaction(async (tx) => {
      const [newProject] = await tx
        .insert(projects)
        .values({
          ...projectBody,
          userId: user.id,
          currentStage: "narrative",
          aspectRatio: aspectRatio || "16:9",
        })
        .returning();

      await Promise.all([
        tx.insert(narratives).values({
          projectId: newProject.id,
          targetAudience: targetAudience || null,
          duration: duration || null,
        }),
        tx.insert(visionBoards).values({
          projectId: newProject.id,
        }),
        tx.insert(assemblies).values({ projectId: newProject.id }),
      ]);

      return newProject;
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
