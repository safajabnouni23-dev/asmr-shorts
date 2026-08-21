import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, likedVideos } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, videoId, videoTitle, creatorGender, action } = body as {
      deviceId: string;
      videoId: string;
      videoTitle: string;
      creatorGender?: string;
      action: "like" | "unlike";
    };

    if (!deviceId || !videoId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "like") {
      // Add like
      try {
        await db.insert(likedVideos).values({
          deviceId,
          videoId,
          videoTitle: videoTitle || "",
          creatorGender: creatorGender || "unknown",
        });
      } catch {
        // Ignore duplicates
      }

      // Adaptive learning: if male user likes male creator content, increase ratio
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.deviceId, deviceId))
        .limit(1);

      if (userResult.length > 0 && userResult[0].gender === "male") {
        // Count male creator likes
        const maleLikes = await db
          .select({ count: sql<number>`count(*)` })
          .from(likedVideos)
          .where(
            and(
              eq(likedVideos.deviceId, deviceId),
              eq(likedVideos.creatorGender, "male")
            )
          );

        const totalLikes = await db
          .select({ count: sql<number>`count(*)` })
          .from(likedVideos)
          .where(eq(likedVideos.deviceId, deviceId));

        const maleCount = Number(maleLikes[0]?.count || 0);
        const totalCount = Number(totalLikes[0]?.count || 0);

        if (totalCount > 0) {
          const newRatio = Math.min(
            50,
            Math.round((maleCount / totalCount) * 100)
          );
          await db
            .update(users)
            .set({ maleContentRatio: newRatio })
            .where(eq(users.deviceId, deviceId));
        }
      }

      return NextResponse.json({ success: true, action: "liked" });
    }

    if (action === "unlike") {
      await db
        .delete(likedVideos)
        .where(
          and(
            eq(likedVideos.deviceId, deviceId),
            eq(likedVideos.videoId, videoId)
          )
        );

      return NextResponse.json({ success: true, action: "unliked" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Like API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    const likes = await db
      .select({ videoId: likedVideos.videoId })
      .from(likedVideos)
      .where(eq(likedVideos.deviceId, deviceId));

    const likedVideoIds = likes.map((l: { videoId: string }) => l.videoId);
    return NextResponse.json({ likedVideoIds });
  } catch (err) {
    console.error("Get likes error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
