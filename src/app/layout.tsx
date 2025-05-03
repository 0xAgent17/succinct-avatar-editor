import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Succinct Avatar Editor",
  description: "Create your unique avatar in cyberpunk neon style!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <main style={{ 
          minHeight: '100vh',
          background: '#19191A',
          fontFamily: "'Orbitron', Arial, sans-serif"
        }}>
          {children}
        </main>
      </body>
    </html>
  );
}
