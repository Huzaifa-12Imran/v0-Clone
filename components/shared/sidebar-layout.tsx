"use client";

import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function SidebarLayout({ children }: { children: ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        isOpen ? "ml-72" : "ml-16"
      )}
    >
      {children}
    </div>
  );
}
