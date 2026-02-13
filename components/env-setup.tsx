"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MissingEnvVar } from "@/lib/env-check";

interface EnvSetupProps {
  missingVars: MissingEnvVar[];
}

export function EnvSetup({ missingVars }: EnvSetupProps) {
  const [copied, setCopied] = useState(false);

  const envFileContent = missingVars
    .map((envVar) => {
      if (envVar.example) {
        return `${envVar.name}=${envVar.example}`;
      }
      return `${envVar.name}=`;
    })
    .join("\n");

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(envFileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-black">
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="mb-4 font-bold text-3xl text-gray-900 dark:text-white">
              Setup Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Add these environment variables to your{" "}
              <code className="rounded bg-gray-200 px-1 dark:bg-gray-800">
                .env
              </code>{" "}
              file:
            </p>
          </div>

          <div className="mb-6 rounded-lg bg-[oklch(0.922_0_0)] p-6 dark:bg-[oklch(1_0_0_/_15%)]">
            <pre className="whitespace-pre-wrap break-all text-gray-900 text-sm dark:text-gray-100">
              {envFileContent}
            </pre>
          </div>

          <div className="space-y-4 text-center">
            <Button
              onClick={copyToClipboard}
              className="flex w-full items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>

            <p className="text-gray-500 text-sm dark:text-gray-400">
              After adding the variables, restart your server
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
