import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Video Generator — Free Text to Video",
  description:
    "Generate stunning AI-powered videos from text descriptions for free. No skills required — just describe your vision.",
  keywords: ["AI video generator", "text to video", "free video generation", "AI video"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
