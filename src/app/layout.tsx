import type { Metadata } from "next";
import "./globals.css";
import { DataHealthProvider } from "@/components/DataHealthProvider";

export const metadata: Metadata = {
  title: "Opelle",
  description: "Opelle shell",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <DataHealthProvider>{children}</DataHealthProvider>
      </body>
    </html>
  );
}
