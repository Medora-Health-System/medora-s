import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("medora_access")?.value;

    // Optionally call backend logout endpoint if we have a token
    if (accessToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        // Log but don't fail if backend logout fails
        console.error("Backend logout call failed:", error);
      }
    }

    // Clear cookies by setting Max-Age=0
    cookieStore.set("medora_access", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    cookieStore.set("medora_refresh", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    // Still try to clear cookies even if there's an error
    const cookieStore = await cookies();
    cookieStore.set("medora_access", "", { maxAge: 0, path: "/" });
    cookieStore.set("medora_refresh", "", { maxAge: 0, path: "/" });
    return NextResponse.json({ success: true });
  }
}

