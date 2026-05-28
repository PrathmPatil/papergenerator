import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ui/toast";
import { Teachers } from "./teacher";
import { Toaster } from "@/components/ui/toaster";
import { AppDialogProvider } from "@/components/app-dialog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PaperGenerator",
  description: "PaperGenerator, powered by Swami Infotech",
  generator: "Swami Infotech",
  icons: {
    icon: [
      {
        url: "/app-icon.png",
        type: "image/png",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <AppDialogProvider>
            <Providers>{children}</Providers>
          </AppDialogProvider>
          <Analytics />
        </ToastProvider>
        <Toaster />
      </body>
    </html>
  );
}
