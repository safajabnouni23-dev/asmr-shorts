import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "connected" });
  } catch (err) {
    console.log("[/api/health] DB error:", (err as Error).message);
    return Response.json({ ok: true, db: "disconnected", note: "App still works with fallback" });
  }
}
