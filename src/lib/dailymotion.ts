// Dailymotion Public API — ASMR videos (any length, high quality)
// Strategy: Fetch long-form ASMR, then extract random 30-50s snippets
// No API key required for public endpoints

const DM_API_BASE = "https://api.dailymotion.com";

export interface DailymotionVideo {
  videoId: string;
  embedUrl: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  duration: number; // Total duration in seconds
  source: "dailymotion";
}

// Search queries for high-quality ASMR content (long-form preferred)
const DM_SEARCH_QUERIES = [
  "ASMR Relaxing",
  "ASMR sleep long",
  "ASMR whispering full",
  "ASMR tapping compilation",
  "ASMR triggers extended",
  "ASMR relaxation deep",
  "ASMR tingles long form",
  "ASMR soft spoken full video",
  "ASMR roleplay full",
  "ASMR sounds compilation",
  "ASMR massage full session",
  "ASMR hair brushing long",
  "ASMR ear cleaning full",
  "ASMR mouth sounds extended",
  "ASMR relaxing long video",
  "ASMR sleep aid hours",
  "ASMR no talking long",
  "ASMR scratching compilation",
];

export async function searchDailymotionASMR(
  page: number = 1,
  excludeIds: string[] = []
): Promise<{ videos: DailymotionVideo[]; nextPage: number | null }> {
  const query = DM_SEARCH_QUERIES[Math.floor(Math.random() * DM_SEARCH_QUERIES.length)];

  const params = new URLSearchParams({
    fields: "id,title,embed_url,channel.name,views_total,duration,thumbnail_720_url",
    search: query,
    limit: "20",
    page: String(page),
    sort: "visited", // Most viewed = higher quality
    family_filter: "false",
  });

  console.log("[Dailymotion] Searching:", query, "| page:", page);

  try {
    const res = await fetch(`${DM_API_BASE}/videos?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("[Dailymotion] API error:", res.status);
      return { videos: [], nextPage: null };
    }

    const data = await res.json();
    const items = data.list || [];
    const hasMore = data.has_more || false;

    console.log("[Dailymotion] Found:", items.length, "videos | hasMore:", hasMore);

    const videos: DailymotionVideo[] = items
      .filter((item: any) => {
        if (excludeIds.includes(item.id)) return false;
        if (!item.embed_url) return false;
        // Must have duration and be at least 60 seconds (long-form)
        if (!item.duration || item.duration < 60) return false;
        return true;
      })
      .map((item: any) => ({
        videoId: item.id,
        embedUrl: item.embed_url,
        title: item.title || "ASMR Video",
        channelTitle: item["channel.name"] || item.channel?.name || "Dailymotion",
        viewCount: item.views_total || 0,
        duration: item.duration || 0, // Duration in seconds
        source: "dailymotion" as const,
      }));

    // Sort by view count descending
    videos.sort((a, b) => b.viewCount - a.viewCount);

    console.log("[Dailymotion] Filtered:", videos.length, "long-form videos");

    return {
      videos,
      nextPage: hasMore ? page + 1 : null,
    };
  } catch (err) {
    console.error("[Dailymotion] Fetch failed:", (err as Error).message);
    return { videos: [], nextPage: null };
  }
}

// Generate random snippet from a long video
export function getRandomSnippet(duration: number): {
  startTime: number;
  clipDuration: number;
} {
  // Clip duration: random between 30-50 seconds
  const clipDuration = 30 + Math.floor(Math.random() * 21); // 30-50

  // Start time: random, but leave at least clipDuration seconds remaining
  const maxStart = Math.max(0, duration - clipDuration - 10);
  const startTime = Math.floor(Math.random() * maxStart);

  return { startTime, clipDuration };
}

// Build Dailymotion embed URL with start time
export function getDailymotionEmbedUrl(
  videoId: string,
  startTime: number = 0
): string {
  return `https://www.dailymotion.com/embed/video/${videoId}?start=${startTime}&autoplay=1&mute=0&ui-start-screen-info=false&ui-logo=false&sharing-enable=false&endscreen-enable=false&queue-enable=false&controls=false`;
}
