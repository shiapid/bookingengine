import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHIAP Booking Engine",
  description: "Platform reservasi untuk tim dan bisnis.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
