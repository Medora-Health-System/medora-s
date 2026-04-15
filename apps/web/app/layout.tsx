import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineRuntime } from "@/components/offline/OfflineRuntime";
import { I18nProvider } from "@/i18n/provider";

export const metadata: Metadata = {
  title: "Medora-S",
  applicationName: "Medora-S",
  description:
    "Plateforme intégrée de dossier patient électronique et de surveillance de santé publique.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "any" },
    ],
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
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}

