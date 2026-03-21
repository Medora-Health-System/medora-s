import { NextRequest } from "next/server";
import { proxyNestRequest } from "@/lib/server/nestApiProxy";

/** Résultats avec PJ volumineuses : évite les timeouts sur téléversement. */
export const maxDuration = 120;

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
