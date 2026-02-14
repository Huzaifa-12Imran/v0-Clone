"use client";

import { Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileTree, type FileNode } from "./file-tree";
import { MonacoEditor } from "./monaco-editor";

interface CodeEditorPanelProps {
  projectId: string;
  files: FileNode[];
  onFilesChange?: (files: FileNode[]) => void;
  className?: string;
}

export function CodeEditorPanel({
  projectId,
  files,
  onFilesChange,
  className,
}: CodeEditorPanelProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openTabs, setOpenTabs] = useState<FileNode[]>([]);

  // Load file content when a file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.type === "file") {
      setFileContent(selectedFile.content || "");
      setHasUnsavedChanges(false);

      // Add to open tabs if not already there
      if (!openTabs.find((tab) => tab.id === selectedFile.id)) {
        setOpenTabs([...openTabs, selectedFile]);
      }
    }
  }, [selectedFile]);

  const handleFileSelect = (file: FileNode) => {
    if (file.type === "file") {
      setSelectedFile(file);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== fileContent) {
      setFileContent(value);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileContent,
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        
        // Update the file in the tree
        if (selectedFile) {
          selectedFile.content = fileContent;
        }
      } else {
        console.error("Failed to save file");
      }
    } catch (error) {
      console.error("Error saving file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseTab = (file: FileNode) => {
    const newTabs = openTabs.filter((tab) => tab.id !== file.id);
    setOpenTabs(newTabs);

    if (selectedFile?.id === file.id) {
      setSelectedFile(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "css":
        return "css";
      case "html":
        return "html";
      case "md":
        return "markdown";
      default:
        return "plaintext";
    }
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Tabs Bar */}
      {openTabs.length > 0 && (
        <div className="flex items-center gap-1 border-b bg-muted/30 px-2">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setSelectedFile(tab)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedFile(tab);
                }
              }}
              tabIndex={0}
              role="button"
              className={cn(
                "group flex items-center gap-2 rounded-t border-b-2 px-3 py-2 text-sm transition-colors cursor-pointer outline-none",
                selectedFile?.id === tab.id
                  ? "border-primary bg-background"
                  : "border-transparent hover:bg-muted/50 flex-none"
              )}
            >
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="w-64 border-r">
          <div className="border-b p-2">
            <h3 className="font-semibold text-sm">Files</h3>
          </div>
          <FileTree
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>

        {/* Editor Area */}
        <div className="flex flex-1 flex-col">
          {selectedFile ? (
            <>
              {/* Editor Header */}
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{selectedFile.name}</span>
                  {hasUnsavedChanges && (
                    <span className="text-muted-foreground text-xs">
                      (unsaved)
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1">
                <MonacoEditor
                  value={fileContent}
                  onChange={handleEditorChange}
                  language={getLanguageFromFileName(selectedFile.name)}
                  path={selectedFile.path}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="font-medium">No file selected</p>
                <p className="text-sm">Select a file from the tree to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
