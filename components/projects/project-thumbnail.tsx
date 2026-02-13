"use client";

import { Monitor } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProjectThumbnailProps {
  demoUrl: string | null;
  name: string;
}

function getScreenshotUrl(demoUrl: string): string {
  return `https://image.thum.io/get/width/600/crop/400/${demoUrl}`;
}

export function ProjectThumbnail({ demoUrl, name }: ProjectThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  if (!demoUrl || hasError) {
    return (
      <div className="flex aspect-[3/2] items-center justify-center bg-gray-100 dark:bg-zinc-800">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <Monitor className="mx-auto h-8 w-8" />
          <p className="mt-2 text-xs">No screenshot available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-zinc-800">
      <Image
        src={getScreenshotUrl(demoUrl)}
        alt={name}
        fill
        className="object-cover object-top transition-transform group-hover:scale-105"
        onError={() => setHasError(true)}
        unoptimized
      />
    </div>
  );
}
