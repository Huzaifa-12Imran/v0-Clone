import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StreamingProvider } from "@/contexts/streaming-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SidebarLayout } from "@/components/shared/sidebar-layout";

export const metadata: Metadata = {
  title: "v0 Clone",
  description:
    "A clone of v0.app built with the v0 SDK - Generate and preview React components with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <SWRProvider>
              <StreamingProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarLayout>{children}</SidebarLayout>
                </SidebarProvider>
              </StreamingProvider>
            </SWRProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
