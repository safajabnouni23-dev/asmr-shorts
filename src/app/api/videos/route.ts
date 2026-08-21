import { NextRequest, NextResponse } from "next/server";
import { searchASMRVideos, YouTubeVideo } from "@/lib/youtube";
import { isASMRContent } from "@/lib/gemini";
import { FALLBACK_VIDEOS } from "@/lib/fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  console.log("[/api/videos] Request received");

  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const pageToken = req.nextUrl.searchParams.get("pageToken") || undefined;
  const excludeIds =
    req.nextUrl.searchParams.get("excludeIds")?.split(",").filter(Boolean) ||
    [];

  console.log("[/api/videos] deviceId:", deviceId?.slice(0, 8) + "...");
  console.log("[/api/videos] excludeIds count:", excludeIds.length);
  console.log("[/api/videos] YOUTUBE_API_KEY present:", !!process.env.YOUTUBE_API_KEY);
  console.log("[/api/videos] GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

  if (!deviceId) {
    console.log("[/api/videos] ERROR: No deviceId");
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  // Try to get user from database (non-blocking — if DB fails, use defaults)
  let userGender = "male";
  let maleRatio = 10;

  try {
    console.log("[/api/videos] Attempting database connection...");
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.deviceId, deviceId))
      .limit(1);

    if (userResult.length > 0) {
      userGender = userResult[0].gender;
      maleRatio = userResult[0].maleContentRatio;
      console.log("[/api/videos] User found:", userGender, "ratio:", maleRatio);
    } else {
      console.log("[/api/videos] User not found in DB, using defaults");
      // Try to create user silently
      try {
        await db.insert(users).values({
          deviceId,
          gender: "male",
          maleContentRatio: 10,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        });
        console.log("[/api/videos] Created new user in DB");
      } catch (createErr) {
        console.log("[/api/videos] Could not create user:", (createErr as Error).message);
      }
    }
  } catch (dbErr) {
    console.log("[/api/videos] DATABASE ERROR:", (dbErr as Error).message);
    console.log("[/api/videos] Continuing with default user settings (no DB)");
  }

  // Try YouTube API
  let rawVideos: YouTubeVideo[] = [];
  let nextPageToken: string | null = null;

  try {
    console.log("[/api/videos] Searching YouTube...");
    const result = await searchASMRVideos(
      userGender,
      maleRatio,
      pageToken,
      excludeIds
    );
    rawVideos = result.videos;
    nextPageToken = result.nextPageToken;
    console.log("[/api/videos] YouTube returned:", rawVideos.length, "videos");
  } catch (ytErr) {
    console.log("[/api/videos] YOUTUBE ERROR:", (ytErr as Error).message);
  }

  // If YouTube returned nothing, use fallback
  if (rawVideos.length === 0) {
    console.log("[/api/videos] No YouTube videos — using FALLBACK data");
    const fallbackFiltered = FALLBACK_VIDEOS.filter(
      (v) => !excludeIds.includes(v.videoId)
    );
    return NextResponse.json({
      videos: fallbackFiltered,
      nextPageToken: null,
      source: "fallback",
    });
  }

  // Filter through Gemini
  const approvedVideos: YouTubeVideo[] = [];

  for (const video of rawVideos) {
    let approved = true;
    try {
      approved = await isASMRContent(video.title, video.description);
      console.log("[/api/videos] Gemini:", video.title.slice(0, 40), "→", approved ? "APPROVE" : "REJECT");
    } catch (geminiErr) {
      console.log("[/api/videos] GEMINI ERROR for", video.videoId, "— approving by default");
      approved = true;
    }

    // Cache in database (non-blocking)
    try {
      const { db } = await import("@/db");
      const { videoCache } = await import("@/db/schema");
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
      // Ignore cache errors
    }

    if (approved) {
      approvedVideos.push(video);
    }
  }

  console.log("[/api/videos] Final approved count:", approvedVideos.length);

  // If all videos were rejected by Gemini, use fallback
  if (approvedVideos.length === 0) {
    console.log("[/api/videos] All videos rejected — using FALLBACK data");
    const fallbackFiltered = FALLBACK_VIDEOS.filter(
      (v) => !excludeIds.includes(v.videoId)
    );
    return NextResponse.json({
      videos: fallbackFiltered,
      nextPageToken: null,
      source: "fallback",
    });
  }

  return NextResponse.json({
    videos: approvedVideos,
    nextPageToken,
    source: "youtube",
  });
}
