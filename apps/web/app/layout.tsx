import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { OfflineRuntime } from "@/components/offline/OfflineRuntime";

export const metadata: Metadata = {
  title: "Medora-S",
  applicationName: "Medora-S",
  description: "Medora-S dossier patient et suivi des soins",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        <OfflineRuntime />
        {children}
      </body>
    </html>
  );
}

