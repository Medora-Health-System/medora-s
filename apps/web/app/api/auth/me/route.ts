import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("medora_access")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Call backend /auth/me endpoint
    const backendResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!backendResponse.ok) {
      // If 401, might need to try refresh - but for now just return error
      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const errorData = await backendResponse.json().catch(() => ({ error: "Request failed" }));
      return NextResponse.json(
        { error: errorData.error || errorData.message || "Request failed" },
        { status: backendResponse.status }
      );
    }

    const userData = await backendResponse.json();
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

