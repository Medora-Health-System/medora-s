import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim() ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "Adresse courriel requise." },
        { status: 400 }
      );
    }

    const r = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const message = data.message ?? data.error ?? "Une erreur s'est produite. Réessayez.";
      return NextResponse.json({ error: message }, { status: r.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Service indisponible. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
