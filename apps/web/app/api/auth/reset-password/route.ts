import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? process.env.MEDORA_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, token, newPassword } = body;

    if (!id || !token || !newPassword) {
      return NextResponse.json(
        { error: "Lien invalide ou données manquantes." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    const r = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token, newPassword }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const message = data.message ?? data.error ?? "Lien invalide ou expiré. Demandez un nouveau lien.";
      return NextResponse.json({ error: message }, { status: r.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Service indisponible. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
