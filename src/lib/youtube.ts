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

// Search queries optimized for ASMR content
const MALE_TARGET_QUERIES = [
  "Female ASMR",
  "Girl ASMR triggers",
  "Beautiful Girl ASMR",
  "ASMR female whispering",
  "ASMR girl tapping",
  "ASMR woman soft spoken",
  "ASMR female roleplay",
  "ASMR girl ear cleaning",
  "ASMR female massage",
  "ASMR woman tingles",
];

const FEMALE_TARGET_QUERIES = [
  "Male ASMR",
  "ASMR male whispering",
  "ASMR man soft spoken",
  "ASMR male roleplay",
  "ASMR man tapping",
  "ASMR male triggers",
  "ASMR deep voice male",
  "ASMR man ear cleaning",
];

const GENERAL_QUERIES = [
  "ASMR",
  "ASMR triggers",
  "ASMR tingles",
  "ASMR sleep",
  "ASMR relaxation",
  "ASMR tapping",
  "ASMR whispering",
  "ASMR sounds",
];

export async function searchASMRVideos(
  gender: string,
  maleRatio: number,
  pageToken?: string,
  excludeIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  // Determine which query set to use based on user gender and adaptive ratio
  let queries: string[];
  if (gender === "male") {
    const femaleWeight = Math.max(10, 90 - maleRatio);
    if (Math.random() * 100 < femaleWeight) {
      queries = MALE_TARGET_QUERIES;
    } else {
      queries = GENERAL_QUERIES;
    }
  } else if (gender === "female") {
    queries = FEMALE_TARGET_QUERIES;
  } else {
    queries = GENERAL_QUERIES;
  }

  // Pick a random query from the selected set
  const query = queries[Math.floor(Math.random() * queries.length)];

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoDuration: "short",
    maxResults: "12",
    order: "viewCount",
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
      return vid && !excludeIds.includes(vid);
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

  return { videos, nextPageToken };
}
