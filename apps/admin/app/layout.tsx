import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn Admin — Platform Operations",
  description:
    "Admin dashboard to manage partners, customers, reports, and platform configuration.",
};

// Applies the saved theme before first paint so pages don't flash light, and so
// pages outside the dashboard shell (login, 403) also honour the user's choice.
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
