import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

async function getFacilityId(req: NextRequest): Promise<string | null> {
  // Priority: header > cookie > fetch from /auth/me
  const headerFacilityId = req.headers.get("x-facility-id");
  if (headerFacilityId) return headerFacilityId;

  const cookieStore = await cookies();
  const cookieFacilityId = cookieStore.get("facilityId")?.value;
  if (cookieFacilityId) return cookieFacilityId;

  // Fallback: try to get from /auth/me
  const accessToken = cookieStore.get("accessToken")?.value;
  if (accessToken) {
    try {
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (meResponse.ok) {
        const userData = await meResponse.json();
        const firstFacilityId = userData?.facilityRoles?.[0]?.facilityId;
        if (firstFacilityId) {
          // Cache it in cookie for next time
          cookieStore.set("facilityId", firstFacilityId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          });
          return firstFacilityId;
        }
      }
    } catch (e) {
      console.error("Failed to fetch facilityId from /auth/me:", e);
    }
  }

  return null;
}

async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const path = ctx.params.path.join("/");
  const url = `${API_URL}/${path}${req.nextUrl.search}`;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const facilityId = await getFacilityId(req);
  if (!facilityId) {
    return NextResponse.json({ message: "No facility selected" }, { status: 400 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("x-facility-id", facilityId);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
  };

  const r = await fetch(url, init);

  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(req: NextRequest, ctx: any) { return handler(req, ctx); }
export async function POST(req: NextRequest, ctx: any) { return handler(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any) { return handler(req, ctx); }
export async function PUT(req: NextRequest, ctx: any) { return handler(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any) { return handler(req, ctx); }

