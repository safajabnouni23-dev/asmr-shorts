import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, videoCache } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { searchASMRVideos, YouTubeVideo } from "@/lib/youtube";
import { isASMRContent } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    const pageToken = req.nextUrl.searchParams.get("pageToken") || undefined;
    const excludeIds =
      req.nextUrl.searchParams.get("excludeIds")?.split(",").filter(Boolean) ||
      [];

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    // Get user info
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.deviceId, deviceId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult[0];

    // Search YouTube for ASMR videos
    let rawVideos: YouTubeVideo[] = [];
    let nextPageToken: string | null = null;

    try {
      const result = await searchASMRVideos(
        user.gender,
        user.maleContentRatio,
        pageToken,
        excludeIds
      );
      rawVideos = result.videos;
      nextPageToken = result.nextPageToken;
    } catch (ytErr) {
      console.error("YouTube search failed:", ytErr);
      // Return empty instead of crashing
      return NextResponse.json({ videos: [], nextPageToken: null });
    }

    if (rawVideos.length === 0) {
      return NextResponse.json({ videos: [], nextPageToken: null });
    }

    // Check cache first
    const cachedIds = rawVideos.map((v) => v.videoId);
    let cached: typeof videoCache.$inferSelect[] = [];
    try {
      if (cachedIds.length > 0) {
        cached = await db
          .select()
          .from(videoCache)
          .where(
            and(
              inArray(videoCache.videoId, cachedIds),
              eq(videoCache.approved, true)
            )
          );
      }
    } catch (cacheErr) {
      console.error("Cache read failed:", cacheErr);
      cached = [];
    }

    const cachedVideoIds = new Set(cached.map((c) => c.videoId));

    // Filter uncached videos through Gemini
    const uncachedVideos = rawVideos.filter(
      (v) => !cachedVideoIds.has(v.videoId)
    );

    const approvedVideos: YouTubeVideo[] = [];

    // Process uncached videos through Gemini (with timeout protection)
    for (const video of uncachedVideos) {
      let approved = true; // Default approve if Gemini fails
      try {
        approved = await isASMRContent(video.title, video.description);
      } catch (geminiErr) {
        console.error("Gemini check failed for", video.videoId, geminiErr);
        approved = true; // Fail open
      }

      // Cache the result
      try {
        await db.insert(videoCache).values({
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          channelTitle: video.channelTitle,
          viewCount: video.viewCount,
          approved,
        });
      } catch {
        // Ignore duplicate key errors
      }

      if (approved) {
        approvedVideos.push(video);
      }
    }

    // Combine cached approved + newly approved
    const cachedAsVideos: YouTubeVideo[] = cached.map((c) => ({
      videoId: c.videoId,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      channelTitle: c.channelTitle,
      viewCount: c.viewCount,
    }));

    const allApproved = [...cachedAsVideos, ...approvedVideos];

    return NextResponse.json({
      videos: allApproved,
      nextPageToken,
    });
  } catch (err) {
    console.error("Videos API error:", err);
    return NextResponse.json(
      { error: "Internal server error", videos: [], nextPageToken: null },
      { status: 500 }
    );
  }
}
