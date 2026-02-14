"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  path?: string;
  readOnly?: boolean;
  height?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = "typescript",
  path,
  readOnly = false,
  height = "100%",
}: MonacoEditorProps) {
  const { theme } = useTheme();
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    setIsEditorReady(true);
    
    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly,
      automaticLayout: true,
    });
  };

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme === "dark" ? "vs-dark" : "light"}
        path={path}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
}
