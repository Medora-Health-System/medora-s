import { ROLE_CODES } from "@medora/shared";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Medora S</h1>
      <p>Web scaffold is running.</p>
      <p style={{ color: "#555" }}>Shared roles: {ROLE_CODES.join(", ")}</p>
    </main>
  );
}

