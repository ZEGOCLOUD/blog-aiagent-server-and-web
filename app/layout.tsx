import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZEGO AI Agent",
  description: "ZEGO AI Agent Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
