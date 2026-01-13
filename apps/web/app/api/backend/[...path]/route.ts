import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const path = ctx.params.path.join("/");
  const url = `${API_URL}/${path}${req.nextUrl.search}`;

  const accessToken = req.cookies.get("accessToken")?.value;

  // Facility selection: you can store this in a cookie (recommended)
  // or pass it from client -> proxy via header.
  const facilityId =
    req.headers.get("x-facility-id") ||
    req.cookies.get("facilityId")?.value ||
    "";

  const headers = new Headers(req.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (facilityId) headers.set("x-facility-id", facilityId);

  // Never forward cookies to backend (we're using bearer token)
  headers.delete("cookie");

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

