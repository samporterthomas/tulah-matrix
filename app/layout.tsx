import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tulah Comparator Matrix",
  description:
    "Analysis interface for the Tulah competitor benchmarking matrix.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
