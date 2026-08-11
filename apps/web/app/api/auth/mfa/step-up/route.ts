import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accessTokenCookieOptions } from "@/lib/server/authCookieOptions";import {jwtAccessTtlSeconds} from "@/lib/server/sessionCookieOptions";
export async function POST(req: NextRequest) {
  const store=await cookies(); const token=store.get("accessToken")?.value??store.get("medora_session")?.value;
  if(!token)return NextResponse.json({message:"Authentication required"},{status:401});
  const upstream=await fetch(`${process.env.API_URL??"http://localhost:3001"}/auth/mfa/step-up`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:await req.text(),cache:"no-store"});
  const body=await upstream.json().catch(()=>({}));const response=NextResponse.json(body,{status:upstream.status});
  if(upstream.ok&&typeof body.accessToken==="string"){const options=accessTokenCookieOptions(jwtAccessTtlSeconds());response.cookies.set("accessToken",body.accessToken,options);response.cookies.set("medora_session",body.accessToken,options)}return response;
}
