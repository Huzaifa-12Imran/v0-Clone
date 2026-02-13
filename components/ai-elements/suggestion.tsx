"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkScrollability = useCallback(() => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;
    if (!scrollArea) {
      return;
    }

    const { scrollLeft: sl, scrollWidth, clientWidth } = scrollArea;
    setCanScrollLeft(sl > 0);
    setCanScrollRight(sl < scrollWidth - clientWidth - 1); // -1 for rounding
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;
    if (!scrollArea) return;

    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(scrollArea.scrollLeft);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const scrollArea = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement;
      if (!scrollArea) return;

      const x = e.clientX;
      const walk = (x - startX) * 1.5; // Scroll speed multiplier
      scrollArea.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;
    if (!scrollArea) {
      return;
    }

    // Check initial state
    checkScrollability();

    // Add scroll listener
    scrollArea.addEventListener("scroll", checkScrollability);

    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(scrollArea);

    return () => {
      scrollArea.removeEventListener("scroll", checkScrollability);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  return (
    <div
      className="relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left fade overlay */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute -top-px -left-px z-10 h-[calc(100%+1px)] w-12 bg-gradient-to-r from-gray-50 to-transparent dark:from-black" />
      )}

      {/* Right fade overlay */}
      {canScrollRight && (
        <div className="pointer-events-none absolute -top-px -right-px z-10 h-[calc(100%+1px)] w-12 bg-gradient-to-l from-gray-50 to-transparent dark:from-black" />
      )}

      <ScrollArea
        ref={scrollAreaRef}
        className={cn(
          "w-full overflow-x-auto whitespace-nowrap",
          isDragging ? "cursor-grab active:cursor-grabbing" : "cursor-grab",
        )}
        {...props}
      >
        <div
          className={cn("flex w-max flex-nowrap items-center gap-2", className)}
        >
          {children}
        </div>
        <ScrollBar className="hidden" orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
