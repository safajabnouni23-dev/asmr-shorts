import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.deviceId, deviceId))
      .limit(1);

    if (existing.length > 0) {
      // Update last active
      await db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.deviceId, deviceId));

      return NextResponse.json({
        user: existing[0],
        isNew: false,
      });
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

    return NextResponse.json({
      user: newUser,
      isNew: true,
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.deviceId, deviceId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ user: null });
    }

    // Update last active
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.deviceId, deviceId));

    return NextResponse.json({ user: user[0] });
  } catch (err) {
    console.error("Get user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
