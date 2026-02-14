import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getProjectById,
  getProjectFiles,
  updateProjectFile,
  saveProjectFiles,
  deleteProjectFile,
} from "@/lib/db/queries";

// GET: Retrieve all files for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version");

    // Get project to verify ownership
    const project = await getProjectById({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get files
    const files = await getProjectFiles({
      projectId: project.id,
      version: version ? parseInt(version, 10) : project.current_version,
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching project files:", error);
    return NextResponse.json(
      { error: "Failed to fetch project files" },
      { status: 500 }
    );
  }
}

// POST: Create new files for a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const { files, version } = await request.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: "Files array is required" },
        { status: 400 }
      );
    }

    // Get project to verify ownership
    const project = await getProjectById({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Save files
    const savedFiles = await saveProjectFiles({
      projectId: project.id,
      version: version || project.current_version,
      files: files.map((f: any) => ({
        filePath: f.path || f.filePath,
        fileContent: f.content || f.fileContent,
        fileType: f.type || f.fileType,
      })),
    });

    return NextResponse.json({ files: savedFiles });
  } catch (error) {
    console.error("Error creating project files:", error);
    return NextResponse.json(
      { error: "Failed to create project files" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const { fileId, fileContent } = await request.json();

    if (!fileId || !fileContent) {
      return NextResponse.json(
        { error: "fileId and fileContent are required" },
        { status: 400 }
      );
    }

    // Get project to verify ownership
    const project = await getProjectById({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update file
    const updatedFile = await updateProjectFile({ fileId, fileContent });

    return NextResponse.json({ file: updatedFile });
  } catch (error) {
    console.error("Error updating project file:", error);
    return NextResponse.json(
      { error: "Failed to update project file" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    // Get project to verify ownership
    const project = await getProjectById({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file
    await deleteProjectFile({ fileId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project file:", error);
    return NextResponse.json(
      { error: "Failed to delete project file" },
      { status: 500 }
    );
  }
}
