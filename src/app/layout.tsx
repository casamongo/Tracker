import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SWRProvider } from "@/components/SWRProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Planning Tracker",
  description: "Jira Planning Dashboard with AI-powered summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  );
}
