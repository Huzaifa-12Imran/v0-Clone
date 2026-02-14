"use client";

import { Rocket, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeployButtonProps {
  projectId: string;
  disabled?: boolean;
}

export function DeployButton({ projectId, disabled }: DeployButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vercelToken, setVercelToken] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!vercelToken.trim()) {
      setError("Please enter your Vercel token");
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      const response = await fetch("/api/deploy/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          vercelToken: vercelToken.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Deployment failed");
      }

      const data = await response.json();
      setDeploymentUrl(`https://${data.url}`);
      
      // Save token to localStorage for future use (optional)
      if (typeof window !== "undefined") {
        localStorage.setItem("vercel_token", vercelToken.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Try to load saved token
      if (typeof window !== "undefined") {
        const savedToken = localStorage.getItem("vercel_token");
        if (savedToken) {
          setVercelToken(savedToken);
        }
      }
      setDeploymentUrl(null);
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" disabled={disabled}>
          <Rocket className="mr-2 h-4 w-4" />
          Deploy to Vercel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deploy to Vercel</DialogTitle>
          <DialogDescription>
            Deploy your project to Vercel in one click. You'll need a Vercel API token.
          </DialogDescription>
        </DialogHeader>

        {!deploymentUrl ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vercel-token">Vercel API Token</Label>
                <Input
                  id="vercel-token"
                  type="password"
                  placeholder="Enter your Vercel token"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  disabled={isDeploying}
                />
                <p className="text-muted-foreground text-xs">
                  Get your token from{" "}
                  <a
                    href="https://vercel.com/account/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Vercel Settings
                  </a>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isDeploying}
              >
                Cancel
              </Button>
              <Button onClick={handleDeploy} disabled={isDeploying}>
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-green-500 bg-green-50 p-8 dark:bg-green-950/20">
                <div className="text-center">
                  <div className="mb-2 flex justify-center">
                    <Rocket className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="mb-2 font-semibold text-lg">Deployment Successful!</h3>
                  <p className="mb-4 text-muted-foreground text-sm">
                    Your project is now live on Vercel
                  </p>
                  <a
                    href={deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    {deploymentUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
