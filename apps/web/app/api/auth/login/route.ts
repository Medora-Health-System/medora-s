import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.MEDORA_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse and map username from various possible fields
    const username = body.username ?? body.email ?? body.identifier ?? body.user ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Call API login endpoint
    const r = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({ error: "Login failed" }));
      return NextResponse.json(
        errorData,
        { status: r.status }
      );
    }

    const json = await r.json();

    // Set HttpOnly cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("accessToken", json.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    cookieStore.set("refreshToken", json.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Return only user, not tokens
    return NextResponse.json({ user: json.user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

