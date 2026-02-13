import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects";
import { ProjectThumbnail } from "./project-thumbnail";
import { formatRelativeTime } from "./utils";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/chats/${project.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border bg-white transition-shadow hover:shadow-lg dark:border-input dark:bg-zinc-900">
        <ProjectThumbnail demoUrl={project.demoUrl} name={project.name} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {project.name}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Edited {formatRelativeTime(project.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
