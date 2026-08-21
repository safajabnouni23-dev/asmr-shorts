import { NextRequest, NextResponse } from "next/server";
import { searchASMRVideos, YouTubeVideo } from "@/lib/youtube";
import { isASMRContent } from "@/lib/gemini";
import { FALLBACK_VIDEOS } from "@/lib/fallback";
import { TIKTOK_ASRM_VIDEOS } from "@/lib/tiktok-data";

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

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  // Detect user
  let userGender = "male";
  let maleRatio = 10;
  let isNewVisitor = true;

  try {
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
      isNewVisitor = false;
    } else {
      console.log("[/api/videos] NEW VISITOR — premium content");
      try {
        await db.insert(users).values({
          deviceId,
          gender: "male",
          maleContentRatio: 10,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        });
      } catch {}
    }
  } catch (dbErr) {
    console.log("[/api/videos] DB error:", (dbErr as Error).message);
  }

  // === STEP 1: Try YouTube API ===
  let rawVideos: YouTubeVideo[] = [];
  let nextPageToken: string | null = null;
  let youtubeSuccess = false;

  try {
    console.log("[/api/videos] Trying YouTube...");
    const result = await searchASMRVideos(
      userGender,
      maleRatio,
      pageToken,
      excludeIds,
      isNewVisitor
    );
    rawVideos = result.videos;
    nextPageToken = result.nextPageToken;
    youtubeSuccess = rawVideos.length > 0;
    console.log("[/api/videos] YouTube:", rawVideos.length, "videos");
  } catch (ytErr) {
    console.log("[/api/videos] YouTube FAILED:", (ytErr as Error).message);
  }

  // === STEP 2: Filter YouTube videos ===
  let approvedVideos: YouTubeVideo[] = [];

  if (youtubeSuccess) {
    if (isNewVisitor) {
      // Quick filter for new visitors
      for (const video of rawVideos) {
        const title = video.title.toLowerCase();
        const desc = video.description.toLowerCase();
        const hasAsmrKeywords =
          title.includes("asmr") || desc.includes("asmr") ||
          title.includes("whisper") || title.includes("tingles") ||
          title.includes("triggers") || title.includes("relax") ||
          title.includes("sleep");
        if (hasAsmrKeywords) approvedVideos.push(video);
      }
    } else {
      // Full Gemini filter for returning visitors
      for (const video of rawVideos) {
        let approved = true;
        try {
          approved = await isASMRContent(video.title, video.description);
        } catch { approved = true; }
        if (approved) approvedVideos.push(video);
      }
    }
  }

  console.log("[/api/videos] YouTube approved:", approvedVideos.length);

  // === STEP 3: Smart Fallback — Mix TikTok if YouTube is weak ===
  const MIN_VIDEOS = 8; // Minimum acceptable videos
  const finalVideos: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
    viewCount: number;
    source: "youtube" | "tiktok";
    embedUrl?: string;
  }> = [];

  // Add approved YouTube videos
  for (const v of approvedVideos) {
    finalVideos.push({
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      channelTitle: v.channelTitle,
      viewCount: v.viewCount,
      source: "youtube",
    });
  }

  // If YouTube didn't return enough, add TikTok videos
  if (finalVideos.length < MIN_VIDEOS) {
    console.log("[/api/videos] YouTube weak (" + finalVideos.length + ") — adding TikTok fallback");
    const tiktokFiltered = TIKTOK_ASRM_VIDEOS.filter(
      (t) => !excludeIds.includes(t.videoId)
    );
    for (const t of tiktokFiltered) {
      finalVideos.push({
        videoId: t.videoId,
        title: t.title,
        description: "",
        thumbnailUrl: "",
        channelTitle: t.channelTitle,
        viewCount: t.viewCount,
        source: "tiktok",
        embedUrl: t.embedUrl,
      });
    }
  }

  // If still no videos at all, use YouTube fallback + TikTok
  if (finalVideos.length === 0) {
    console.log("[/api/videos] Total fallback — YouTube fallback + TikTok");
    for (const v of FALLBACK_VIDEOS) {
      if (!excludeIds.includes(v.videoId)) {
        finalVideos.push({ ...v, source: "youtube" });
      }
    }
    for (const t of TIKTOK_ASRM_VIDEOS) {
      if (!excludeIds.includes(t.videoId)) {
        finalVideos.push({
          videoId: t.videoId,
          title: t.title,
          description: "",
          thumbnailUrl: "",
          channelTitle: t.channelTitle,
          viewCount: t.viewCount,
          source: "tiktok",
          embedUrl: t.embedUrl,
        });
      }
    }
  }

  console.log("[/api/videos] Final mix:", finalVideos.length, "videos | YouTube:", finalVideos.filter(v => v.source === "youtube").length, "| TikTok:", finalVideos.filter(v => v.source === "tiktok").length);

  return NextResponse.json({
    videos: finalVideos,
    nextPageToken: youtubeSuccess ? nextPageToken : null,
    source: youtubeSuccess ? "youtube" : "hybrid",
    isNewVisitor,
  });
}
