import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINANCE AI",
  description: "AI-powered financial management for organizations",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
