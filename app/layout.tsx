import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Buy airtime, subscribe data, pay electricity bills, cable TV subscriptions and exam PINs instantly. Fast, secure and reliable VTU and digital payment services by ANNASHUWA VTU.",
  applicationName: APP_NAME,
  keywords: ["VTU", "airtime", "data", "electricity", "cable tv", "exam pins", "ANNASHUWA", "Nigeria"],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: "Buy airtime, data, pay bills and more in seconds.",
    type: "website",
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#28aa63" },
    { media: "(prefers-color-scheme: dark)", color: "#133425" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}