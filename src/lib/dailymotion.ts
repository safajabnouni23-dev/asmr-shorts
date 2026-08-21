// Dailymotion Public API — ASMR Shorts (< 60 seconds)
// No API key required for public endpoints
// Docs: https://developer.dailymotion.com/api/

const DM_API_BASE = "https://api.dailymotion.com";

export interface DailymotionVideo {
  videoId: string;
  embedUrl: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  source: "dailymotion";
}

// Search queries optimized for ASMR short-form content
const DM_SEARCH_QUERIES = [
  "ASMR",
  "ASMR sleep",
  "ASMR whispering",
  "ASMR tapping",
  "ASMR triggers",
  "ASMR relaxation",
  "ASMR tingles",
  "ASMR soft spoken",
  "ASMR roleplay",
  "ASMR sounds",
  "ASMR massage",
  "ASMR hair brushing",
  "ASMR ear cleaning",
  "ASMR mouth sounds",
  "ASMR relaxing",
];

export async function searchDailymotionASMR(
  page: number = 1,
  excludeIds: string[] = []
): Promise<{ videos: DailymotionVideo[]; nextPage: number | null }> {
  const query = DM_SEARCH_QUERIES[Math.floor(Math.random() * DM_SEARCH_QUERIES.length)];

  const params = new URLSearchParams({
    fields: "id,title,embed_url,channel.name,views_total,duration,thumbnail_720_url",
    search: query,
    longer_than: "0",
    shorter_than: "60", // CRITICAL: Only shorts under 60 seconds
    limit: "20",
    page: String(page),
    sort: "visited", // Sort by most viewed for engagement
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
        // Filter out excluded IDs
        if (excludeIds.includes(item.id)) return false;
        // Must have embed URL
        if (!item.embed_url) return false;
        // Duration must be under 60 seconds (double-check)
        if (item.duration && item.duration > 60) return false;
        return true;
      })
      .map((item: any) => ({
        videoId: item.id,
        embedUrl: item.embed_url,
        title: item.title || "ASMR Short",
        channelTitle: item["channel.name"] || item.channel?.name || "Dailymotion",
        viewCount: item.views_total || item["views_total"] || 0,
        source: "dailymotion" as const,
      }));

    // Sort by view count descending
    videos.sort((a, b) => b.viewCount - a.viewCount);

    return {
      videos,
      nextPage: hasMore ? page + 1 : null,
    };
  } catch (err) {
    console.error("[Dailymotion] Fetch failed:", (err as Error).message);
    return { videos: [], nextPage: null };
  }
}

// Get Dailymotion embed URL for a video ID
export function getDailymotionEmbedUrl(videoId: string): string {
  return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=0&ui-start-screen-info=false&ui-logo=false&sharing-enable=false&endscreen-enable=false`;
}
