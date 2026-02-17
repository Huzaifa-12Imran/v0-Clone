"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSnowfall } from "@/contexts/snowfall-context";
import { Button } from "@/components/ui/button";
import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

const UserNav = dynamic(
  () => import("@/components/user-nav").then((mod) => mod.UserNav),
  { ssr: false },
);

interface AppHeaderProps {
  className?: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler() {
  const searchParams = useSearchParams();
  const { update } = useSession();

  // Force session refresh when redirected after auth
  useEffect(() => {
    const shouldRefresh = searchParams.get("refresh") === "session";

    if (shouldRefresh) {
      // Force session update
      update();

      // Clean up URL without causing navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("refresh");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, update]);

  return null;
}

export function AppHeader({ className = "" }: AppHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isSnowing, toggleSnowfall } = useSnowfall();
  const isHomepage = pathname === "/";
  const isConsole = pathname === "/console" || pathname.startsWith("/chats");

  // Handle logo click - reset UI if on console, otherwise navigate to homepage
  const handleLogoClick = (e: React.MouseEvent) => {
    if (isConsole) {
      // If we're on the console or a chat, we might want to just reset if on /console
      // But usually logo goes home. User's instruction was to lead to current app.
    }
  };

  return (
    <div className={cn("border-border border-b dark:border-input bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50", className)}>
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="font-bold text-gray-900 text-xl hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
            >
              Home
            </Link>

            <nav className="hidden md:flex items-center gap-6 font-medium text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link 
                href="/console" 
                className={cn(
                  "hover:text-foreground transition-colors",
                  isConsole && "text-foreground font-semibold"
                )}
              >
                Console
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSnowfall}
              title={isSnowing ? "Disable Snowfall" : "Enable Snowfall"}
              className={cn("h-9 w-9", !isSnowing && "opacity-50")}
            >
              <Snowflake className={cn("h-4 w-4", isSnowing && "text-blue-400 animate-pulse")} />
            </Button>
            <ThemeToggle />
            <UserNav session={session} />
          </div>
        </div>
      </div>
    </div>
  );
}
