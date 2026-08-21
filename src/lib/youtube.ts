import { YOUTUBE_API_KEY } from "@/lib/config";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  viewCount: number;
}

// ============================================
// SEARCH QUERIES — 90%+ Female ASMR Creators
// Optimized for high engagement & soothing voices
// ============================================

// Primary queries — female creators with high engagement (used 90% of the time)
const FEMALE_HIGH_ENGAGEMENT_QUERIES = [
  "ASMR female soothing voice",
  "ASMR girl relaxing triggers",
  "ASMR makeup roleplay female",
  "ASMR beautiful girl whispering",
  "ASMR woman soft spoken sleep",
  "ASMR female tapping nails",
  "ASMR girl ear cleaning relaxing",
  "ASMR woman gentle whispers",
  "ASMR female hair brushing",
  "ASMR girl personal attention",
  "ASMR female massage roleplay",
  "ASMR woman tingles sleep",
  "ASMR girl close whispers",
  "ASMR female skincare roleplay",
  "ASMR woman relaxing sounds",
  "ASMR female mouth sounds",
  "ASMR girl cranial nerve exam",
  "ASMR woman face brushing",
  "ASMR female spa roleplay",
  "ASMR girl sleep triggers",
];

// Secondary queries — general high-quality ASMR (used 10% of the time)
const GENERAL_HIGH_QUALITY_QUERIES = [
  "ASMR best triggers 2025",
  "ASMR most popular sleep",
  "ASMR viral tingles",
  "ASMR satisfying sounds",
];

// New visitor queries — guaranteed high view count content
const NEW_VISITOR_QUERIES = [
  "ASMR female most viewed",
  "ASMR girl viral shorts",
  "ASMR woman millions views",
  "ASMR popular female creator",
];

export async function searchASMRVideos(
  gender: string,
  maleRatio: number,
  pageToken?: string,
  excludeIds: string[] = [],
  isNewVisitor: boolean = false
): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  // Select query pool based on visitor status and gender
  let queries: string[];

  if (isNewVisitor) {
    // New visitor: show highest engagement female content
    queries = NEW_VISITOR_QUERIES;
  } else if (gender === "male") {
    // Male user: 90% female creators, 10% general (adjusted by adaptive ratio)
    const femaleWeight = Math.max(85, 95 - maleRatio);
    if (Math.random() * 100 < femaleWeight) {
      queries = FEMALE_HIGH_ENGAGEMENT_QUERIES;
    } else {
      queries = GENERAL_HIGH_QUALITY_QUERIES;
    }
  } else if (gender === "female") {
    // Female user: still 90% female creators (most popular ASMR content)
    if (Math.random() < 0.9) {
      queries = FEMALE_HIGH_ENGAGEMENT_QUERIES;
    } else {
      queries = GENERAL_HIGH_QUALITY_QUERIES;
    }
  } else {
    // Unknown gender: default to female creators for maximum engagement
    queries = FEMALE_HIGH_ENGAGEMENT_QUERIES;
  }

  // Pick a random query from the selected pool
  const query = queries[Math.floor(Math.random() * queries.length)];

  console.log("[YouTube] Searching:", query, "| isNewVisitor:", isNewVisitor);

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoDuration: "short",
    maxResults: "15",
    order: "viewCount", // Always sort by highest views for engagement
    key: YOUTUBE_API_KEY,
    relevanceLanguage: "en",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  let searchData: any;
  try {
    const searchRes = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("YouTube search error:", searchRes.status, errText);
      return { videos: [], nextPageToken: null };
    }

    searchData = await searchRes.json();
  } catch (err) {
    console.error("YouTube search fetch failed:", err);
    return { videos: [], nextPageToken: null };
  }

  const items = searchData.items || [];
  const nextPageToken = searchData.nextPageToken || null;

  if (items.length === 0) {
    return { videos: [], nextPageToken: null };
  }

  // Get video IDs and fetch detailed stats
  const videoIds = items
    .map((item: any) => item.id?.videoId)
    .filter(Boolean)
    .join(",");

  if (!videoIds) {
    return { videos: [], nextPageToken: null };
  }

  const videoParams = new URLSearchParams({
    part: "snippet,statistics",
    id: videoIds,
    key: YOUTUBE_API_KEY,
  });

  let videoData: any;
  try {
    const videoRes = await fetch(
      `${YOUTUBE_VIDEOS_URL}?${videoParams.toString()}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!videoRes.ok) {
      console.error("YouTube video details error:", videoRes.status);
      return { videos: [], nextPageToken: null };
    }

    videoData = await videoRes.json();
  } catch (err) {
    console.error("YouTube video details fetch failed:", err);
    return { videos: [], nextPageToken: null };
  }

  const videos: YouTubeVideo[] = (videoData.items || [])
    .filter((item: any) => {
      const vid = item.id;
      if (!vid || excludeIds.includes(vid)) return false;

      // For new visitors: filter for minimum view count to ensure quality
      const stats = item.statistics || {};
      const viewCount = parseInt(stats.viewCount || "0", 10);
      if (isNewVisitor && viewCount < 50000) {
        console.log("[YouTube] Filtered low views for new visitor:", vid, viewCount);
        return false;
      }

      return true;
    })
    .map((item: any) => {
      const snippet = item.snippet || {};
      const stats = item.statistics || {};
      const thumbnails = snippet.thumbnails || {};
      const thumb =
        thumbnails.high || thumbnails.medium || thumbnails.default || {};

      return {
        videoId: item.id,
        title: snippet.title || "",
        description: snippet.description || "",
        thumbnailUrl: thumb.url || "",
        channelTitle: snippet.channelTitle || "",
        viewCount: parseInt(stats.viewCount || "0", 10),
      };
    });

  // Sort by view count descending for maximum engagement
  videos.sort((a, b) => b.viewCount - a.viewCount);

  console.log("[YouTube] Found", videos.length, "videos | Top views:", videos[0]?.viewCount || 0);

  return { videos, nextPageToken };
}
