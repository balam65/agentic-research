import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery Dashboard",
  description: "Monitor processed data, trigger deliveries, and inspect logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
