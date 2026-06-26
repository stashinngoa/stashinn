import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn Admin — Platform Operations",
  description:
    "Admin dashboard to manage partners, customers, reports, and platform configuration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
