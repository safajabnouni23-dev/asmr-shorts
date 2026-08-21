// TikTok ASMR Fallback Videos — REAL video IDs verified from TikTok
// Used when YouTube API fails or quota is exhausted
// Embed format: https://www.tiktok.com/embed/v2/{video_id}

export interface TikTokVideo {
  videoId: string;
  embedUrl: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  source: "tiktok";
}

export const TIKTOK_ASRM_VIDEOS: TikTokVideo[] = [
  {
    videoId: "7627112563154701590",
    embedUrl: "https://www.tiktok.com/embed/v2/7627112563154701590",
    title: "ASMR Gentle Tapping to Help You Relax & Sleep Fast 💤",
    channelTitle: "@asmr_kto_live",
    viewCount: 1400000,
    source: "tiktok",
  },
  {
    videoId: "7503255340360666411",
    embedUrl: "https://www.tiktok.com/embed/v2/7503255340360666411",
    title: "My Three Favorite ASMR Triggers! 🥰 What Are Yours?",
    channelTitle: "@whisperingwillowasmr",
    viewCount: 116500,
    source: "tiktok",
  },
  {
    videoId: "7227920781047794990",
    embedUrl: "https://www.tiktok.com/embed/v2/7227920781047794990",
    title: "Close Your Eyes and Rest With Me 💤💤 Whispering ASMR",
    channelTitle: "@asmrglowofficial",
    viewCount: 26100,
    source: "tiktok",
  },
  {
    videoId: "7573801571574648086",
    embedUrl: "https://www.tiktok.com/embed/v2/7573801571574648086",
    title: "ASMR For DEEP SLEEP in 2 Min 😴💤 Face Brushing",
    channelTitle: "@michelleswhispersasmr",
    viewCount: 7543,
    source: "tiktok",
  },
  {
    videoId: "7573751091851201815",
    embedUrl: "https://www.tiktok.com/embed/v2/7573751091851201815",
    title: "Soft Tapping for Ultimate Relaxation ✨ ASMR Triggers",
    channelTitle: "@cashmere_asmr",
    viewCount: 801,
    source: "tiktok",
  },
  {
    videoId: "7574967465914977558",
    embedUrl: "https://www.tiktok.com/embed/v2/7574967465914977558",
    title: "Relaxing Whispering 💛 ASMR Sleep Aid",
    channelTitle: "@rosywhispersasmr",
    viewCount: 57,
    source: "tiktok",
  },
  {
    videoId: "7490973907738987798",
    embedUrl: "https://www.tiktok.com/embed/v2/7490973907738987798",
    title: "Did You Fall Asleep? 😴 ASMR Compilation #asmr",
    channelTitle: "@asmr",
    viewCount: 31200,
    source: "tiktok",
  },
  {
    videoId: "7607446805197917462",
    embedUrl: "https://www.tiktok.com/embed/v2/7607446805197917462",
    title: "ASMR Inaudible Whispering for Deep Sleep 🥰",
    channelTitle: "@asmr_faithxoxo",
    viewCount: 1734,
    source: "tiktok",
  },
  {
    videoId: "7628784888853974285",
    embedUrl: "https://www.tiktok.com/embed/v2/7628784888853974285",
    title: "Personal Attention ASMR for Deep Sleep 💜",
    channelTitle: "@alliwallyasmr",
    viewCount: 198,
    source: "tiktok",
  },
  {
    videoId: "7131067589727489285",
    embedUrl: "https://www.tiktok.com/embed/v2/7131067589727489285",
    title: "ASMR Assessing Your Face 🥰 Personal Attention",
    channelTitle: "@softlysweet.asmr",
    viewCount: 5000,
    source: "tiktok",
  },
];
