import "server-only";

interface VercelDeploymentConfig {
  name: string;
  files: Array<{
    file: string;
    data: string;
  }>;
  projectSettings?: {
    framework: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
  };
}

interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: string;
  alias?: string[];
}

/**
 * Creates a deployment on Vercel using their API
 */
export async function createVercelDeployment(
  token: string,
  config: VercelDeploymentConfig
): Promise<VercelDeploymentResponse> {
  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: config.name,
      files: config.files,
      projectSettings: config.projectSettings || {
        framework: "nextjs",
        buildCommand: "pnpm build",
        outputDirectory: ".next",
        installCommand: "pnpm install",
      },
      target: "production",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel deployment failed: ${error}`);
  }

  return await response.json();
}

/**
 * Gets the status of a Vercel deployment
 */
export async function getDeploymentStatus(
  token: string,
  deploymentId: string
): Promise<VercelDeploymentResponse> {
  const response = await fetch(
    `https://api.vercel.com/v13/deployments/${deploymentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get deployment status");
  }

  return await response.json();
}

/**
 * Converts project files to Vercel deployment format
 */
export function convertFilesToVercelFormat(
  files: Array<{ file_path: string; file_content: string }>
): Array<{ file: string; data: string }> {
  return files.map((file) => ({
    file: file.file_path,
    data: Buffer.from(file.file_content).toString("base64"),
  }));
}
