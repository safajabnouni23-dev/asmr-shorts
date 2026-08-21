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

  if (!deviceId) {
    console.log("[/api/videos] ERROR: No deviceId");
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  // Try to get user from database (non-blocking — if DB fails, use defaults)
  let userGender = "male";
  let maleRatio = 10;
  let isNewVisitor = true; // Default: treat as new visitor for best content

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
      isNewVisitor = false; // Returning visitor
      console.log("[/api/videos] Returning user:", userGender, "ratio:", maleRatio);
    } else {
      console.log("[/api/videos] NEW VISITOR detected — serving premium content");
      // Create user in background
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
    console.log("[/api/videos] Continuing with new visitor defaults (premium content)");
  }

  // Try YouTube API — new visitors get highest quality content
  let rawVideos: YouTubeVideo[] = [];
  let nextPageToken: string | null = null;

  try {
    console.log("[/api/videos] Searching YouTube... isNewVisitor:", isNewVisitor);
    const result = await searchASMRVideos(
      userGender,
      maleRatio,
      pageToken,
      excludeIds,
      isNewVisitor
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
      isNewVisitor,
    });
  }

  // Filter through Gemini (skip for new visitors to speed up loading)
  const approvedVideos: YouTubeVideo[] = [];

  if (isNewVisitor) {
    // For new visitors: skip Gemini filter for faster loading, trust YouTube results
    // Only do a quick title-based filter
    for (const video of rawVideos) {
      const title = video.title.toLowerCase();
      const desc = video.description.toLowerCase();
      // Quick check: must have ASMR-related keywords
      const hasAsmrKeywords =
        title.includes("asmr") ||
        desc.includes("asmr") ||
        title.includes("whisper") ||
        title.includes("tingles") ||
        title.includes("triggers") ||
        title.includes("relax") ||
        title.includes("sleep");

      if (hasAsmrKeywords) {
        approvedVideos.push(video);
      } else {
        console.log("[/api/videos] Quick filter rejected:", video.title.slice(0, 40));
      }
    }
    console.log("[/api/videos] Quick filter approved:", approvedVideos.length, "videos for new visitor");
  } else {
    // Returning visitors: full Gemini filter
    for (const video of rawVideos) {
      let approved = true;
      try {
        approved = await isASMRContent(video.title, video.description);
        console.log("[/api/videos] Gemini:", video.title.slice(0, 40), "→", approved ? "APPROVE" : "REJECT");
      } catch (geminiErr) {
        console.log("[/api/videos] GEMINI ERROR — approving by default");
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
  }

  console.log("[/api/videos] Final approved count:", approvedVideos.length);

  // If all videos were rejected, use fallback
  if (approvedVideos.length === 0) {
    console.log("[/api/videos] All videos rejected — using FALLBACK data");
    const fallbackFiltered = FALLBACK_VIDEOS.filter(
      (v) => !excludeIds.includes(v.videoId)
    );
    return NextResponse.json({
      videos: fallbackFiltered,
      nextPageToken: null,
      source: "fallback",
      isNewVisitor,
    });
  }

  return NextResponse.json({
    videos: approvedVideos,
    nextPageToken,
    source: "youtube",
    isNewVisitor,
  });
}
