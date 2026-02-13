"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ChevronRight, Home, Folder, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

interface Chat {
  id: string;
  name?: string;
  createdAt: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useSidebar();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetch("/api/chats")
      .then((res) => res.json())
      .then((data) => setChats(data.data || []))
      .catch(console.error);
  }, []);

  // Close sidebar on navigation
  useEffect(() => {
    close();
  }, [pathname, close]);

  const mainNavItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/projects", icon: Folder, label: "Projects" },
    { href: "/chats", icon: MessageSquare, label: "Chats" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Sidebar - Always visible on the left */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full border-r z-30 transition-all duration-300 ease-in-out flex flex-col",
          "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
          isOpen ? "w-72" : "w-16"
        )}
      >
        {/* Header with v0 Clone */}
        <div className={cn(
          "h-16 flex items-center border-b",
          !isOpen && "justify-center",
          "border-zinc-200 dark:border-zinc-800"
        )}>
          {isOpen ? (
            <h2 className="font-semibold px-4 text-zinc-900 dark:text-white">
              v0 Clone
            </h2>
          ) : (
            <span className="font-semibold text-zinc-900 dark:text-white">
              v0
            </span>
          )}
        </div>

        {/* Toggle Button - Below header */}
        <div className={cn(
          "border-b border-zinc-200 dark:border-zinc-800",
          !isOpen && "flex justify-center"
        )}>
          <button
            onClick={toggle}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              "hover:bg-zinc-100 dark:hover:bg-zinc-800",
              isOpen && "mx-2 my-1"
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                "text-zinc-600 dark:text-zinc-400",
                !isOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
            {/* + New Chat Button */}
            {isOpen ? (
              <Link
                href="/chats"
                onClick={close}
                className={cn(
                  "flex items-center gap-2 w-full p-3 rounded-lg mb-1",
                  "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900",
                  "hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New Chat</span>
              </Link>
            ) : (
              <Link
                href="/chats"
                onClick={close}
                className={cn(
                  "flex items-center justify-center p-3 rounded-lg mb-1",
                  "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900",
                  "hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                )}
              >
                <Plus className="h-4 w-4" />
              </Link>
            )}

            {/* Navigation Items */}
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors mb-1",
                  "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white",
                  !isOpen && "justify-center"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Recent Chats Section */}
          {isOpen && (
            <div className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-500">
                Recent Chats
              </h3>
              <div className="space-y-1">
                {chats.length === 0 ? (
                  <div className="text-center text-zinc-500 text-sm py-4">
                    No recent chats
                  </div>
                ) : (
                  chats.slice(0, 10).map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chats/${chat.id}`}
                      onClick={close}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-colors",
                        "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate text-sm">
                        {chat.name || "Untitled Chat"}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content wrapper - always pushed to the right */}
      <div className="transition-all duration-300 ease-in-out ml-16">
        {/* Header overlay for when sidebar is collapsed */}
        <div className="fixed top-0 left-16 right-0 h-4 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
      </div>
    </>
  );
}
