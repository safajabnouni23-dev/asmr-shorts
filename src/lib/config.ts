// Server-side API keys — read from environment variables only.
// These must be set in your hosting platform (Netlify/Vercel) Environment Variables.
// DO NOT hardcode API keys here.

export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const DIRECT_AD_LINK = process.env.DIRECT_AD_LINK || "";
