import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getProjectById, getProjectFiles } from "@/lib/db/queries";
import { generateCompleteProjectZip } from "@/lib/zip-generator";

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
    const files = await getProjectFiles({
      projectId: project.id,
      version: project.current_version,
    });

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files found for this project" },
        { status: 404 }
      );
    }

    // Convert to file structure format
    const fileStructure = files.map((file) => ({
      path: file.file_path,
      content: file.file_content,
      type: file.file_type || undefined,
    }));

    // Generate ZIP
    const zipBlob = await generateCompleteProjectZip(
      fileStructure,
      project.name
    );

    // Convert blob to buffer
    const buffer = Buffer.from(await zipBlob.arrayBuffer());

    // Return ZIP file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error generating project ZIP:", error);
    return NextResponse.json(
      { error: "Failed to generate project ZIP" },
      { status: 500 }
    );
  }
}
