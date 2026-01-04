import type { Metadata } from "next";
import "./globals.css";
import { DataHealthProvider } from "@/components/DataHealthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import AppBackdrop from "@/components/ui/AppBackdrop";
import ThemeMarker from "@/components/ui/ThemeMarker";

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen op-bg antialiased">
        <ThemeProvider>
          <DataHealthProvider>
            <div className="relative min-h-screen">
              <AppBackdrop />
              {children}
              <ThemeMarker />
            </div>
          </DataHealthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
