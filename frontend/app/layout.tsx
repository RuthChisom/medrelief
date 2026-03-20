import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedRelief",
  description: "Decentralized emergency medical funding",
  icons: {
    icon: "/assets/logo.png",
    apple: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
