import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn Partner — Manage Your Storage Locations",
  description:
    "Partner dashboard to manage your luggage storage locations, bookings, and payouts.",
};

// Applies the saved theme before first paint so pages don't flash light
const themeInitScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
