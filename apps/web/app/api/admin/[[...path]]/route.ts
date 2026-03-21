import { NextRequest, NextResponse } from "next/server";
import { proxyNestRequest } from "@/lib/server/nestApiProxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handler(req: NextRequest, ctx: RouteContext) {
  const { path: segments = [] } = await ctx.params;
  if (!segments.length) {
    return NextResponse.json({ message: "Ressource introuvable." }, { status: 404 });
  }
  const nestPath = `admin/${segments.join("/")}`;
  return proxyNestRequest(req, nestPath);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handler(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return handler(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handler(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handler(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handler(req, ctx);
}
