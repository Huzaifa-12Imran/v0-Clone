"use client";

import { Download, Maximize, Minimize, Monitor, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { CodeEditorPanel, type FileNode } from "@/components/code-editor";
import { DeployButton } from "@/components/deployment/deploy-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  demo?: string;
  url?: string;
}

interface PreviewPanelProps {
  currentChat: Chat | null;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  refreshKey: number;
  setRefreshKey: (key: number | ((prev: number) => number)) => void;
}

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  refreshKey,
  setRefreshKey,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering tabs after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load project files when switching to code tab or manual refresh
  useEffect(() => {
    if (activeTab === "code" && currentChat?.id) {
      loadProjectFiles();
    }
  }, [activeTab, currentChat?.id, refreshKey]);

  const loadProjectFiles = async () => {
    if (!currentChat?.id) return;

    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/projects/${currentChat.id}/files`);
      if (response.ok) {
        const data = await response.json();
        // Transform database files to FileNode format
        const files = transformToFileTree(data.files || []);
        setProjectFiles(files);
      }
    } catch (error) {
      console.error("Error loading project files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const transformToFileTree = (dbFiles: any[]): FileNode[] => {
    // Group files by directory structure
    const fileMap = new Map<string, FileNode>();
    const rootFiles: FileNode[] = [];

    // First, create all file nodes
    for (const file of dbFiles) {
      const parts = file.file_path.split("/");
      const fileName = parts[parts.length - 1];

      const fileNode: FileNode = {
        id: file.id,
        name: fileName,
        path: file.file_path,
        type: "file",
        content: file.file_content,
        fileType: file.file_type,
      };

      fileMap.set(file.file_path, fileNode);
    }

    // Then, organize into tree structure
    for (const file of dbFiles) {
      const parts = file.file_path.split("/");
      
      if (parts.length === 1) {
        // Root level file
        const node = fileMap.get(file.file_path);
        if (node) rootFiles.push(node);
      } else {
        // Nested file - create parent folders if needed
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (!fileMap.has(currentPath)) {
            const folderNode: FileNode = {
              id: currentPath,
              name: part,
              path: currentPath,
              type: "folder",
              children: [],
            };
            fileMap.set(currentPath, folderNode);

            // Add to parent
            if (parentPath) {
              const parent = fileMap.get(parentPath);
              if (parent?.children) {
                parent.children.push(folderNode);
              }
            } else {
              rootFiles.push(folderNode);
            }
          }
        }

        // Add file to its parent folder
        const parentPath = parts.slice(0, -1).join("/");
        const parent = fileMap.get(parentPath);
        const fileNode = fileMap.get(file.file_path);
        
        if (parent?.children && fileNode) {
          parent.children.push(fileNode);
        }
      }
    }

    return rootFiles;
  };

  const handleDownload = async () => {
    if (!currentChat?.id) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/projects/${currentChat.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `project-${currentChat.id}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to download project");
      }
    } catch (error) {
      console.error("Error downloading project:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-black" : "flex-1"
      )}
    >
      {!isMounted ? (
        // Show loading state during hydration to prevent mismatch
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value as "preview" | "code")}
          className="flex h-full flex-col"
        >
          {/* Tabs Header with Actions */}
          <div className="flex items-center justify-between border-b px-4 py-2">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code" disabled={!currentChat?.id}>
                Code
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={!currentChat?.id || isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download ZIP"}
              </Button>
              
              <DeployButton
                projectId={currentChat?.id || ""}
                disabled={!currentChat?.id || projectFiles.length === 0}
              />
            </div>
          </div>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 m-0">
            <WebPreview
              defaultUrl={currentChat?.demo || ""}
              onUrlChange={(url) => {
                console.log("Preview URL changed:", url);
              }}
            >
              <WebPreviewNavigation>
                <WebPreviewNavigationButton
                  onClick={() => {
                    setRefreshKey((prev) => prev + 1);
                  }}
                  tooltip="Refresh preview"
                  disabled={!currentChat?.demo}
                >
                  <RefreshCw className="h-4 w-4" />
                </WebPreviewNavigationButton>
                <WebPreviewUrl
                  readOnly
                  placeholder="Your app will appear here..."
                  value={currentChat?.demo || ""}
                />
                <WebPreviewNavigationButton
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  tooltip={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  disabled={!currentChat?.demo}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </WebPreviewNavigationButton>
              </WebPreviewNavigation>
              {currentChat?.demo ? (
                <WebPreviewBody key={refreshKey} src={currentChat.demo} />
              ) : (
                <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-black">
                  <div className="text-center text-border dark:text-input">
                    <div className="mb-2">
                      <Monitor className="mx-auto h-12 w-12 stroke-border text-border dark:stroke-input dark:text-input" />
                    </div>
                    <p className="font-medium text-sm">No preview available</p>
                    <p className="text-xs">
                      Start a conversation to see your app here
                    </p>
                  </div>
                </div>
              )}
            </WebPreview>
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code" className="flex-1 m-0">
            {isLoadingFiles ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">Loading files...</div>
              </div>
            ) : projectFiles.length > 0 ? (
              <CodeEditorPanel
                projectId={currentChat?.id || ""}
                files={projectFiles}
                onFilesChange={setProjectFiles}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="font-medium">No files available</p>
                  <p className="text-sm">
                    Generate code to see the file structure here
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
