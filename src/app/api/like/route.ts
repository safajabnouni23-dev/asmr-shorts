import { NextRequest, NextResponse } from "next/server";

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

    try {
      const { db } = await import("@/db");
      const { users, likedVideos } = await import("@/db/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      if (action === "like") {
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
        return NextResponse.json({ success: true, action: "liked" });
      }

      if (action === "unlike") {
        await db
          .delete(likedVideos)
          .where(and(eq(likedVideos.deviceId, deviceId), eq(likedVideos.videoId, videoId)));
        return NextResponse.json({ success: true, action: "unliked" });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (dbErr) {
      console.log("[/api/like] DB error:", (dbErr as Error).message);
      // Return success anyway — client tracks likes locally too
      return NextResponse.json({ success: true, action, dbFallback: true });
    }
  } catch (err) {
    console.error("[/api/like] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    try {
      const { db } = await import("@/db");
      const { likedVideos } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const likes = await db
        .select({ videoId: likedVideos.videoId })
        .from(likedVideos)
        .where(eq(likedVideos.deviceId, deviceId));

      const likedVideoIds = likes.map((l: { videoId: string }) => l.videoId);
      return NextResponse.json({ likedVideoIds });
    } catch (dbErr) {
      console.log("[/api/like] DB error:", (dbErr as Error).message);
      return NextResponse.json({ likedVideoIds: [] });
    }
  } catch (err) {
    console.error("[/api/like] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
