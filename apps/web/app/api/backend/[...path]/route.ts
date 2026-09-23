import { NextRequest } from "next/server";
import { proxyNestRequest } from "@/lib/server/nestApiProxy";

/**
 * BFF requests can include clinical writes that complete successfully on the Nest API
 * after 120s during transient downstream/database stalls. Keep the proxy alive long
 * enough to receive the authoritative API response instead of surfacing a false 504.
 */
export const maxDuration = 300;

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, ctx: RouteContext) {
  const { path: pathSegments } = await ctx.params;
  const nestPath = pathSegments.join("/");
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
