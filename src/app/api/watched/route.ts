import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Return all watched video IDs for a device
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    try {
      const { db } = await import("@/db");
      const { watchedVideos } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const watched = await db
        .select({ videoId: watchedVideos.videoId })
        .from(watchedVideos)
        .where(eq(watchedVideos.deviceId, deviceId));

      const videoIds = watched.map((w: { videoId: string }) => w.videoId);
      return NextResponse.json({ videoIds });
    } catch (dbErr) {
      console.log("[/api/watched] DB error:", (dbErr as Error).message);
      return NextResponse.json({ videoIds: [] });
    }
  } catch (err) {
    console.error("[/api/watched] Error:", err);
    return NextResponse.json({ error: "Internal server error", videoIds: [] }, { status: 500 });
  }
}

// POST: Mark videos as watched
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, videoIds } = body as {
      deviceId: string;
      videoIds: string[];
    };

    if (!deviceId || !videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json(
        { error: "deviceId and videoIds array required" },
        { status: 400 }
      );
    }

    try {
      const { db } = await import("@/db");
      const { watchedVideos } = await import("@/db/schema");

      for (const videoId of videoIds.slice(0, 50)) {
        try {
          await db.insert(watchedVideos).values({ deviceId, videoId });
        } catch {
          // Ignore duplicates
        }
      }

      return NextResponse.json({ success: true });
    } catch (dbErr) {
      console.log("[/api/watched] DB error:", (dbErr as Error).message);
      return NextResponse.json({ success: true, dbFallback: true });
    }
  } catch (err) {
    console.error("[/api/watched] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
