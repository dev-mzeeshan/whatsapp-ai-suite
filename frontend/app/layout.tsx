import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatSetGo Dashboard",
  description: "WhatsApp Business Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] antialiased">{children}</body>
    </html>
  );
}