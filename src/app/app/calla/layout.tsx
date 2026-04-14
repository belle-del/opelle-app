import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calla — Study Companion",
};

export default function CallaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
