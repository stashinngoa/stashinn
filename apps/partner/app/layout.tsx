import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn Partner — Manage Your Storage Locations",
  description:
    "Partner dashboard to manage your luggage storage locations, bookings, and payouts.",
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
