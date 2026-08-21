import { GEMINI_API_KEY } from "@/lib/config";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function isASMRContent(
  title: string,
  description: string
): Promise<boolean> {
  const prompt = `You are an ASMR content filter. Analyze the following YouTube video and determine if it is PURE ASMR content.

Title: "${title}"
Description: "${description.slice(0, 500)}"

Rules:
- APPROVE if the video is clearly ASMR (whispering, tapping, triggers, roleplay, tingles, relaxation, sleep sounds, etc.)
- REJECT if the video is a vlog, podcast, gaming commentary, news, tutorial, music video, or any non-ASMR content.
- REJECT if the title/description suggests it's NOT primarily ASMR.

Respond with ONLY one word: "APPROVE" or "REJECT". Nothing else.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("Gemini API error:", res.status);
      return true; // Fail open - approve on error
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() ||
      "";

    return text.includes("APPROVE");
  } catch (err) {
    console.error("Gemini API request failed:", err);
    return true; // Fail open
  }
}
