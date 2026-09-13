import { NextRequest, NextResponse } from "next/server";
import { proxyNestRequest } from "@/lib/server/nestApiProxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handler(req: NextRequest, ctx: RouteContext) {
  const { path: segments = [] } = await ctx.params;
  if (!segments.length) return NextResponse.json({ message: "FHIR resource not found." }, { status: 404 });
  return proxyNestRequest(req, `fhir/${segments.join("/")}`);
}

export async function GET(req: NextRequest, ctx: RouteContext) { return handler(req, ctx); }
export async function POST(req: NextRequest, ctx: RouteContext) { return handler(req, ctx); }
