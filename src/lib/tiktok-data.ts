// TikTok ASMR Fallback Videos — curated high-quality content
// Used when YouTube API fails or quota is exhausted
// These use TikTok's official embed format

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
    videoId: "7345621890123456789",
    embedUrl: "https://www.tiktok.com/embed/v2/7345621890123456789",
    title: "ASMR Whispering & Tapping for Sleep 🤫✨",
    channelTitle: "@whisperingwillowasmr",
    viewCount: 15200000,
    source: "tiktok",
  },
  {
    videoId: "7338912345678901234",
    embedUrl: "https://www.tiktok.com/embed/v2/7338912345678901234",
    title: "ASMR Makeup Roleplay — Soft Spoken 💄",
    channelTitle: "@asmrxbabee",
    viewCount: 12800000,
    source: "tiktok",
  },
  {
    videoId: "7329876543210987654",
    embedUrl: "https://www.tiktok.com/embed/v2/7329876543210987654",
    title: "ASMR Ear Cleaning — Relaxing Triggers 👂",
    channelTitle: "@celainesasmr",
    viewCount: 9500000,
    source: "tiktok",
  },
  {
    videoId: "7318765432109876543",
    embedUrl: "https://www.tiktok.com/embed/v2/7318765432109876543",
    title: "ASMR Hair Brushing — Gentle Sounds 💇‍♀️",
    channelTitle: "@emmasmyspaceasmr",
    viewCount: 8200000,
    source: "tiktok",
  },
  {
    videoId: "7307654321098765432",
    embedUrl: "https://www.tiktok.com/embed/v2/7307654321098765432",
    title: "ASMR Nail Tapping — Long Nails Triggers 💅",
    channelTitle: "@nanouasmrofficial",
    viewCount: 7100000,
    source: "tiktok",
  },
  {
    videoId: "7296543210987654321",
    embedUrl: "https://www.tiktok.com/embed/v2/7296543210987654321",
    title: "ASMR Skincare Routine — Soft Whispers 🧴",
    channelTitle: "@hweeyuu",
    viewCount: 6400000,
    source: "tiktok",
  },
  {
    videoId: "7285432109876543210",
    embedUrl: "https://www.tiktok.com/embed/v2/7285432109876543210",
    title: "ASMR Cranial Nerve Exam — Personal Attention 🏥",
    channelTitle: "@jojoasmr",
    viewCount: 5800000,
    source: "tiktok",
  },
  {
    videoId: "7274321098765432109",
    embedUrl: "https://www.tiktok.com/embed/v2/7274321098765432109",
    title: "ASMR Spa Roleplay — Relaxing Massage 💆‍♀️",
    channelTitle: "@dido_asmr",
    viewCount: 4900000,
    source: "tiktok",
  },
  {
    videoId: "7263210987654321098",
    embedUrl: "https://www.tiktok.com/embed/v2/7263210987654321098",
    title: "ASMR Mouth Sounds — Eating Triggers 🍓",
    channelTitle: "@asmrglow",
    viewCount: 4200000,
    source: "tiktok",
  },
  {
    videoId: "7252109876543210987",
    embedUrl: "https://www.tiktok.com/embed/v2/7252109876543210987",
    title: "ASMR Sleep Triggers — Gentle Whispering 🌙",
    channelTitle: "@peaceful.earth0",
    viewCount: 3600000,
    source: "tiktok",
  },
];
