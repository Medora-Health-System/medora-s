export default function HorsLignePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <section
        style={{
          maxWidth: 640,
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          padding: 24,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Vous êtes hors ligne</h1>
        <p style={{ margin: "0 0 10px 0", color: "#444", lineHeight: 1.55 }}>
          Les données déjà enregistrées sur cet appareil restent disponibles.
        </p>
        <p style={{ margin: 0, color: "#444", lineHeight: 1.55 }}>
          Les nouvelles saisies seront synchronisées dès le retour de la connexion.
        </p>
      </section>
    </main>
  );
}
