import { NextRequest, NextResponse } from "next/server";
import { searchASMRVideos, YouTubeVideo } from "@/lib/youtube";
import { isASMRContent } from "@/lib/gemini";
import { FALLBACK_VIDEOS } from "@/lib/fallback";
import { searchDailymotionASMR, getDailymotionEmbedUrl } from "@/lib/dailymotion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  console.log("[/api/videos] Request received");

  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const pageToken = req.nextUrl.searchParams.get("pageToken") || undefined;
  const dmPage = parseInt(req.nextUrl.searchParams.get("dmPage") || "1", 10);
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

  // === PARALLEL FETCH: YouTube + Dailymotion ===
  const [ytResult, dmResult] = await Promise.allSettled([
    // YouTube fetch
    (async () => {
      try {
        console.log("[/api/videos] Fetching YouTube...");
        return await searchASMRVideos(
          userGender,
          maleRatio,
          pageToken,
          excludeIds,
          isNewVisitor
        );
      } catch (err) {
        console.log("[/api/videos] YouTube FAILED:", (err as Error).message);
        return { videos: [], nextPageToken: null };
      }
    })(),
    // Dailymotion fetch
    (async () => {
      try {
        console.log("[/api/videos] Fetching Dailymotion...");
        return await searchDailymotionASMR(dmPage, excludeIds);
      } catch (err) {
        console.log("[/api/videos] Dailymotion FAILED:", (err as Error).message);
        return { videos: [], nextPage: null };
      }
    })(),
  ]);

  // Process YouTube results
  let ytVideos: YouTubeVideo[] = [];
  let ytNextPage: string | null = null;
  if (ytResult.status === "fulfilled") {
    ytVideos = ytResult.value.videos;
    ytNextPage = ytResult.value.nextPageToken;
  }
  console.log("[/api/videos] YouTube:", ytVideos.length, "videos");

  // Process Dailymotion results
  let dmVideos: Array<{
    videoId: string;
    embedUrl: string;
    title: string;
    channelTitle: string;
    viewCount: number;
    source: "dailymotion";
    duration?: number;
  }> = [];
  let dmNextPage: number | null = null;
  if (dmResult.status === "fulfilled") {
    dmVideos = dmResult.value.videos;
    dmNextPage = dmResult.value.nextPage;
  }
  console.log("[/api/videos] Dailymotion:", dmVideos.length, "videos");

  // === Filter YouTube videos ===
  let approvedYt: YouTubeVideo[] = [];
  if (ytVideos.length > 0) {
    if (isNewVisitor) {
      // Quick filter for new visitors
      for (const v of ytVideos) {
        const t = v.title.toLowerCase();
        const d = v.description.toLowerCase();
        if (t.includes("asmr") || d.includes("asmr") || t.includes("whisper") ||
            t.includes("tingles") || t.includes("triggers") || t.includes("relax") ||
            t.includes("sleep")) {
          approvedYt.push(v);
        }
      }
    } else {
      // Full Gemini filter for returning visitors
      for (const v of ytVideos) {
        let approved = true;
        try { approved = await isASMRContent(v.title, v.description); } catch { approved = true; }
        if (approved) approvedYt.push(v);
      }
    }
  }
  console.log("[/api/videos] YouTube approved:", approvedYt.length);

  // === Build final mixed feed ===
  const finalVideos: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
    viewCount: number;
    source: "youtube" | "dailymotion";
    embedUrl?: string;
    duration?: number;
  }> = [];

  // Add YouTube videos
  for (const v of approvedYt) {
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

  // Add Dailymotion videos
  for (const d of dmVideos) {
    finalVideos.push({
      videoId: d.videoId,
      title: d.title,
      description: "",
      thumbnailUrl: "",
      channelTitle: d.channelTitle,
      viewCount: d.viewCount,
      source: "dailymotion",
      embedUrl: d.embedUrl || getDailymotionEmbedUrl(d.videoId),
      duration: d.duration,
    });
  }

  // If both sources failed, use fallback
  if (finalVideos.length === 0) {
    console.log("[/api/videos] Both sources failed — using fallback");
    for (const v of FALLBACK_VIDEOS) {
      if (!excludeIds.includes(v.videoId)) {
        finalVideos.push({ ...v, source: "youtube" });
      }
    }
  }

  // Shuffle to mix YouTube and Dailymotion (but keep high-view first for new visitors)
  if (!isNewVisitor && finalVideos.length > 4) {
    // Light shuffle — keep top 2, shuffle the rest
    const top = finalVideos.slice(0, 2);
    const rest = finalVideos.slice(2);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    finalVideos.length = 0;
    finalVideos.push(...top, ...rest);
  }

  console.log("[/api/videos] Final mix:", finalVideos.length,
    "| YT:", finalVideos.filter(v => v.source === "youtube").length,
    "| DM:", finalVideos.filter(v => v.source === "dailymotion").length);

  return NextResponse.json({
    videos: finalVideos,
    nextPageToken: ytNextPage,
    dmPage: dmNextPage,
    source: approvedYt.length > 0 ? "hybrid" : "fallback",
    isNewVisitor,
  });
}
