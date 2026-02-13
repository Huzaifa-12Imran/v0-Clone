import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import db from "@/lib/db/connection";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { name } = await request.json();

    await db
      .update(users)
      .set({ name: name || null })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 },
    );
  }
}
