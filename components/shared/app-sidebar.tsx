"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Menu, X, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Chat {
  id: string;
  name?: string;
  createdAt: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetch("/api/chats")
      .then((res) => res.json())
      .then((data) => setChats(data.data || []))
      .catch(console.error);
  }, []);

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Sidebar Toggle Button - Fixed position left */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2"
      >
        <Menu className="h-5 w-5 text-zinc-400" />
      </Button>

      {/* Sidebar Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Slides in from left */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header inside sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <Link
            href="/"
            className="font-semibold text-white text-lg hover:text-zinc-300"
          >
            v0 Clone
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-2">
          <Link
            href="/projects"
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              pathname === "/projects"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
            )}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Projects</span>
          </Link>
        </div>

        {/* Recent Chats Section */}
        <div className="border-t border-zinc-800">
          <div className="p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Recent Chats
            </h3>
            <div className="space-y-1">
              {chats.slice(0, 10).map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors text-sm",
                    pathname === `/chats/${chat.id}`
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                  )}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {chat.name || "Untitled Chat"}
                  </span>
                </Link>
              ))}
              {chats.length === 0 && (
                <p className="text-sm text-zinc-500">No recent chats</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
