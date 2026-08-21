import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("[/api/onboarding] POST received");

  try {
    const body = await req.json();
    const { deviceId, gender } = body as {
      deviceId: string;
      gender: string;
    };

    if (!deviceId || !gender) {
      return NextResponse.json(
        { error: "deviceId and gender are required" },
        { status: 400 }
      );
    }

    if (!["male", "female"].includes(gender)) {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }

    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.deviceId, deviceId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(users)
          .set({ lastActiveAt: new Date() })
          .where(eq(users.deviceId, deviceId));

        return NextResponse.json({ user: existing[0], isNew: false });
      }

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          deviceId,
          gender,
          maleContentRatio: 10,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        })
        .returning();

      return NextResponse.json({ user: newUser, isNew: true });
    } catch (dbErr) {
      console.log("[/api/onboarding] DB error:", (dbErr as Error).message);
      // Return a mock user — client already has localStorage
      return NextResponse.json({
        user: { deviceId, gender, maleContentRatio: 10 },
        isNew: true,
        dbFallback: true,
      });
    }
  } catch (err) {
    console.error("[/api/onboarding] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  console.log("[/api/onboarding] GET received");

  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const user = await db
        .select()
        .from(users)
        .where(eq(users.deviceId, deviceId))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json({ user: null });
      }

      return NextResponse.json({ user: user[0] });
    } catch (dbErr) {
      console.log("[/api/onboarding] DB error:", (dbErr as Error).message);
      return NextResponse.json({ user: null });
    }
  } catch (err) {
    console.error("[/api/onboarding] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
