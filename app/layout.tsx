import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { ActiveLanguageProvider } from "./components/ActiveLanguageProvider";
import BottomNav from "./components/BottomNav";
import PWARegister from "./components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tildes AI - спасаем умирающие языки",
  description:
    "Платформа сохранения исчезающих языков: викторина с носителем, загрузка словарей и учебников, словари каждого языка.",
  applicationName: "Tildes AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tildes AI",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#b45309",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-background md:pl-20">
        <ActiveLanguageProvider>
          <main className="mx-auto max-w-[69.12rem] px-4 pb-24 pt-16 md:pb-12 md:pt-4">
            {children}
          </main>
          <BottomNav />
          <PWARegister />
        </ActiveLanguageProvider>
      </body>
    </html>
  );
}
