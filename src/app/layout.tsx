import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";

export const metadata: Metadata = {
  title: "Dublind",
  description: "Интервальные повторения английских слов"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
