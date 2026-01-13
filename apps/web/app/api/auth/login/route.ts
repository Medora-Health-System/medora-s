import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function normalizeTokens(response: any): { accessToken: string; refreshToken: string } | null {
  // Handle various response shapes
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  // Case A: { accessToken, refreshToken }
  if (response.accessToken && response.refreshToken) {
    accessToken = response.accessToken;
    refreshToken = response.refreshToken;
  }
  // Case B: { access_token, refresh_token }
  else if (response.access_token && response.refresh_token) {
    accessToken = response.access_token;
    refreshToken = response.refresh_token;
  }
  // Case C: { data: { accessToken, refreshToken } }
  else if (response.data?.accessToken && response.data?.refreshToken) {
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
  }
  // Case D: { data: { access_token, refresh_token } }
  else if (response.data?.access_token && response.data?.refresh_token) {
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
  }
  else {
    // Log unexpected shape for debugging
    console.error("Unexpected login response shape:", JSON.stringify(response, null, 2));
    return null;
  }

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Call backend login endpoint
    const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: "Login failed" }));
      // Return "Invalid credentials" for 401 errors
      const errorMessage = backendResponse.status === 401
        ? "Invalid credentials"
        : (errorData.error || errorData.message || "Login failed");
      return NextResponse.json(
        { error: errorMessage },
        { status: backendResponse.status }
      );
    }

    const backendData = await backendResponse.json();
    const tokens = normalizeTokens(backendData);

    if (!tokens) {
      return NextResponse.json(
        { error: "Invalid response from server" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    // Set access token cookie (15 minutes = 900 seconds)
    cookieStore.set("medora_access", tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    // Set refresh token cookie (7 days = 604800 seconds)
    cookieStore.set("medora_refresh", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ success: true, user: backendData.user || null });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

