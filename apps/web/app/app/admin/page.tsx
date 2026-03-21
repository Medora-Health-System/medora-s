import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Administration</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Gestion de la plateforme pour les administrateurs de l&apos;établissement.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li>
          <Link
            href="/app/admin/users"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Utilisateurs et accès
          </Link>
        </li>
      </ul>
    </div>
  );
}

