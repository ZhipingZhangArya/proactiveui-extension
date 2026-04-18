import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProactiveUI",
  description: "Intent-Aware Writing and Analysis Co-Pilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
