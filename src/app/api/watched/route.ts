import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { watchedVideos } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET: Return all watched video IDs for a device
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    const watched = await db
      .select({ videoId: watchedVideos.videoId })
      .from(watchedVideos)
      .where(eq(watchedVideos.deviceId, deviceId))
      .orderBy(watchedVideos.watchedAt);

    const videoIds = watched.map((w: { videoId: string }) => w.videoId);
    return NextResponse.json({ videoIds });
  } catch (err) {
    console.error("Get watched error:", err);
    return NextResponse.json(
      { error: "Internal server error", videoIds: [] },
      { status: 500 }
    );
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

    // Insert each watched video (ignore duplicates)
    for (const videoId of videoIds.slice(0, 50)) {
      try {
        await db.insert(watchedVideos).values({
          deviceId,
          videoId,
        });
      } catch {
        // Ignore duplicate key errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save watched error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
