"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
          Account Settings
        </h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className={cn(
            "rounded-lg border p-6",
            "bg-white dark:bg-zinc-900/50",
            "border-zinc-200 dark:border-zinc-800"
          )}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  "text-zinc-600 dark:text-zinc-400"
                )}>
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className={cn(
                    "w-full rounded-md border px-3 py-2",
                    "bg-white dark:bg-zinc-900",
                    "border-zinc-300 dark:border-zinc-700",
                    "text-zinc-600 dark:text-zinc-400",
                    "cursor-not-allowed"
                  )}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  "text-zinc-600 dark:text-zinc-400"
                )}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={cn(
                    "w-full rounded-md border px-3 py-2",
                    "bg-white dark:bg-zinc-900",
                    "border-zinc-300 dark:border-zinc-700",
                    "text-zinc-900 dark:text-white",
                    "placeholder:text-zinc-400"
                  )}
                />
              </div>

              {message && (
                <div
                  className={cn(
                    "rounded-md p-3 text-sm",
                    message.type === "success"
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                  )}
                >
                  {message.text}
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* API Keys Section */}
          <div className={cn(
            "rounded-lg border p-6",
            "bg-white dark:bg-zinc-900/50",
            "border-zinc-200 dark:border-zinc-800"
          )}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              API Keys
            </h2>

            <div className="space-y-4">
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  "text-zinc-600 dark:text-zinc-400"
                )}>
                  v0 API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter your v0 API key"
                  className={cn(
                    "w-full rounded-md border px-3 py-2",
                    "bg-white dark:bg-zinc-900",
                    "border-zinc-300 dark:border-zinc-700",
                    "text-zinc-900 dark:text-white",
                    "placeholder:text-zinc-400"
                  )}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Get your API key from{" "}
                  <a
                    href="https://v0.app/chat/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline"
                  >
                    v0.app
                  </a>
                </p>
              </div>

              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  "text-zinc-600 dark:text-zinc-400"
                )}>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter your Gemini API key"
                  className={cn(
                    "w-full rounded-md border px-3 py-2",
                    "bg-white dark:bg-zinc-900",
                    "border-zinc-300 dark:border-zinc-700",
                    "text-zinc-900 dark:text-white",
                    "placeholder:text-zinc-400"
                  )}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Get your API key from{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              <Button className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                Update API Keys
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className={cn(
            "rounded-lg border p-6",
            "bg-white dark:bg-zinc-900/50",
            "border-zinc-200 dark:border-zinc-800"
          )}>
            <h2 className={cn(
              "mb-4 text-lg font-semibold",
              "text-zinc-900 dark:text-zinc-400"
            )}>
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">Delete Account</p>
                  <p className="text-sm text-zinc-500">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={cn(
                    "border",
                    "border-zinc-300 dark:border-zinc-700",
                    "text-zinc-600 dark:text-zinc-400",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    "hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
