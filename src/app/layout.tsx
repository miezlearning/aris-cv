import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickTailor CV",
  description: "Generator CV ATS local-first untuk menyesuaikan CV dengan deskripsi lowongan."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
