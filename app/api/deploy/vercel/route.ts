import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getProjectById, getProjectFiles } from "@/lib/db/queries";
import {
  createVercelDeployment,
  convertFilesToVercelFormat,
} from "@/lib/vercel-client";
import { generatePackageJson } from "@/lib/zip-generator";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, vercelToken } = await request.json();

    if (!projectId || !vercelToken) {
      return NextResponse.json(
        { error: "projectId and vercelToken are required" },
        { status: 400 }
      );
    }

    // Get project details
    const project = await getProjectById({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify ownership
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project files
    const dbFiles = await getProjectFiles({
      projectId,
      version: project.current_version,
    });

    if (!dbFiles || dbFiles.length === 0) {
      return NextResponse.json(
        { error: "No files found for this project" },
        { status: 404 }
      );
    }

    // Convert to file structure format for package.json generation
    const fileStructure = dbFiles.map((file) => ({
      path: file.file_path,
      content: file.file_content,
      type: file.file_type || undefined,
    }));

    // Generate package.json
    const packageJson = generatePackageJson(fileStructure);

    // Add package.json to files
    const allFiles = [
      ...dbFiles,
      {
        file_path: "package.json",
        file_content: packageJson,
      },
    ];

    // Convert files to Vercel format
    const vercelFiles = convertFilesToVercelFormat(allFiles);

    // Create deployment
    const deployment = await createVercelDeployment(vercelToken, {
      name: project.name.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
      files: vercelFiles,
      projectSettings: {
        framework: "nextjs",
        buildCommand: "pnpm build",
        outputDirectory: ".next",
        installCommand: "pnpm install",
      },
    });

    return NextResponse.json({
      deploymentId: deployment.id,
      url: deployment.url,
      readyState: deployment.readyState,
    });
  } catch (error) {
    console.error("Error deploying to Vercel:", error);
    return NextResponse.json(
      {
        error: "Failed to deploy to Vercel",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET: Check deployment status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get("deploymentId");
    const vercelToken = searchParams.get("vercelToken");

    if (!deploymentId || !vercelToken) {
      return NextResponse.json(
        { error: "deploymentId and vercelToken are required" },
        { status: 400 }
      );
    }

    const { getDeploymentStatus } = await import("@/lib/vercel-client");
    const status = await getDeploymentStatus(vercelToken, deploymentId);

    return NextResponse.json({
      id: status.id,
      url: status.url,
      readyState: status.readyState,
      alias: status.alias,
    });
  } catch (error) {
    console.error("Error checking deployment status:", error);
    return NextResponse.json(
      { error: "Failed to check deployment status" },
      { status: 500 }
    );
  }
}
