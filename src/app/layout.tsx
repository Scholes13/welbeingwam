import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/mobile/BottomNav";
import AppHeader from "@/components/ui/AppHeader";
import { ToastProvider } from "@/context/ToastContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SessionProvider } from "@/context/SessionContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Tour",
  description: "Interactive city tour with gamification.",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Prevents zooming for app-like feel
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "City Tour",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ToastProvider>
          <SettingsProvider>
            <SessionProvider>
              <AppHeader />
              {children}
              <BottomNav />
            </SessionProvider>
          </SettingsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
