import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LiveKitAgentEmbed } from "@/src/components/LiveKitEmbed";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAM2 LoRA Fine-Tuning",
  description: "Fine-tune SAM2 using LoRA - No Code VOS Fine-Tuning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} ${jetbrainsMono.className} antialiased font-sans`}
    >
      <body>
        {children}
        <LiveKitAgentEmbed />
      </body>
    </html>
  );
}
