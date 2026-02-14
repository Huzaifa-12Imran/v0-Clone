"use client";

import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  fileType?: string;
}

interface FileTreeProps {
  files: FileNode[];
  onFileSelect?: (file: FileNode) => void;
  selectedFile?: FileNode | null;
}

export function FileTree({ files, onFileSelect, selectedFile }: FileTreeProps) {
  return (
    <div className="h-full overflow-y-auto bg-muted/30 p-2">
      <div className="space-y-1">
        {files.map((file) => (
          <FileTreeNode
            key={file.id}
            node={file}
            onSelect={onFileSelect}
            selectedFile={selectedFile}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  onSelect?: (file: FileNode) => void;
  selectedFile?: FileNode | null;
  level: number;
}

function FileTreeNode({
  node,
  onSelect,
  selectedFile,
  level,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const isSelected = selectedFile?.id === node.id;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect?.(node);
    }
  };

  const getFileIcon = () => {
    if (isFolder) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      );
    }

    // File type specific icons
    const extension = node.name.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        return <FileCode className="h-4 w-4 text-yellow-500" />;
      case "json":
        return <FileJson className="h-4 w-4 text-green-500" />;
      case "css":
      case "scss":
        return <File className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted",
          isSelected && "bg-muted font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isFolder && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        <span className="flex-shrink-0">{getFileIcon()}</span>
        <span className="truncate">{node.name}</span>
      </button>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
