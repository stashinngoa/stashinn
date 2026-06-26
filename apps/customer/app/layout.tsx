import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn — Store Your Luggage Safely",
  description:
    "Find secure, verified luggage storage spots near you. Book in seconds, travel hands-free.",
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
