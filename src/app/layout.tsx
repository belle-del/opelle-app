import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Opelle - Student Stylist OS",
  description: "The operating system for student stylists. Track clients, appointments, formulas, and education in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="gradient-mesh" />
        <div className="pattern-overlay" />
        {children}
      </body>
    </html>
  );
}
