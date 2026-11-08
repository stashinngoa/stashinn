import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StashInn — Store Your Luggage Safely",
  description:
    "Find secure, verified luggage storage spots near you. Book in seconds, travel hands-free.",
  other: {
    "fast2sms": "ArHgBIs0ZCwLB82Iw7D42zuQbFs2OiOO"
  }
};

// Applies the saved theme before first paint, so dark mode doesn't flash light first
const themeInitScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
