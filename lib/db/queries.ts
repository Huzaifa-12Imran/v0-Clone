import "server-only";

import { supabase } from "./supabase";
import { type User } from "./schema";
import { generateHashedPassword } from "./utils";


/** Retrieves a user by email address. */
export async function getUser(email: string): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("email", email);

    if (error) throw error;
    return data as User[];
  } catch (error) {
    console.error("Failed to get user from database:", error);
    throw error;
  }
}

/** Creates a new user with email and password. */
export async function createUser(
  email: string,
  password: string,
): Promise<User[]> {
  try {
    const hashedPassword = generateHashedPassword(password);
    const { data, error } = await supabase
      .from("users")
      .insert({
        email,
        password: hashedPassword,
      })
      .select();

    if (error) throw error;
    return data as User[];
  } catch (error) {
    console.error("Failed to create user in database:", error);
    throw error;
  }
}

/** Creates a mapping between a v0 chat ID and a user ID. */
export async function createChatOwnership({
  v0ChatId,
  userId,
}: {
  v0ChatId: string;
  userId: string;
}) {
  try {
    const { data, error } = await supabase
      .from("chat_ownerships")
      .insert({
        v0_chat_id: v0ChatId,
        user_id: userId,
      });

    if (error && error.code !== "23505") throw error; // Ignore unique constraint violations
    return data;
  } catch (error) {
    console.warn("⚠️ Database: Failed to create chat ownership. Chat will continue but may not persist.");
    console.error("Error details:", error);
    return null;
  }
}

/** Gets the ownership record for a v0 chat ID. */
export async function getChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    const { data, error } = await supabase
      .from("chat_ownerships")
      .select()
      .eq("v0_chat_id", v0ChatId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get chat ownership from database:", error);
    throw error;
  }
}

/** Gets all chat IDs owned by a user, sorted by creation date (newest first). */
export async function getChatIdsByUserId({
  userId,
}: {
  userId: string;
}): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("chat_ownerships")
      .select("v0_chat_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((o) => o.v0_chat_id);
  } catch (error) {
    console.error("Failed to get chat IDs by user from database:", error);
    throw error;
  }
}

/** Deletes the ownership record for a v0 chat ID. */
export async function deleteChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    const { error } = await supabase
      .from("chat_ownerships")
      .delete()
      .eq("v0_chat_id", v0ChatId);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete chat ownership from database:", error);
    throw error;
  }
}

/**
 * Gets the number of chats created by a user in the specified time window.
 * Used for rate limiting authenticated users.
 */
export async function getChatCountByUserId({
  userId,
  differenceInHours,
}: {
  userId: string;
  differenceInHours: number;
}): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("chat_ownerships")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", hoursAgo);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Failed to get chat count by user from database:", error);
    // Return 0 instead of throwing to prevent blocking the chat
    return 0;
  }
}

// ============ Project Versioning Functions ============

/** Creates a new project. */
export async function createProject({
  userId,
  name,
  description,
  v0ChatId,
}: {
  userId: string;
  name: string;
  description?: string;
  v0ChatId?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name,
        description,
        v0_chat_id: v0ChatId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("⚠️ Database: Failed to create project.");
    console.error("Error details:", error);
    return null;
  }
}

/** Gets all projects for a user. */
export async function getProjectsByUserId({ userId }: { userId: string }) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select()
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get projects from database:", error);
    throw error;
  }
}

/** 
 * Gets a single project by ID (UUID) or v0 chat ID. 
 * This prevents 22P02 errors when a chat ID is passed to a UUID column.
 */
export async function getProjectById({ projectId }: { projectId: string }) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
    
    let query = supabase.from("projects").select();
    
    if (isUuid) {
      query = query.eq("id", projectId);
    } else {
      query = query.eq("v0_chat_id", projectId);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get project from database:", error);
    throw error;
  }
}

/** 
 * Gets a single project by v0 chat ID. 
 * @deprecated Use getProjectById which now handles both.
 */
export async function getProjectByV0ChatId({ v0ChatId }: { v0ChatId: string }) {
  return getProjectById({ projectId: v0ChatId });
}

export async function addProjectVersion({
  projectId,
  prompt,
  generatedCode,
  previewUrl,
  v0MessageId,
}: {
  projectId: string;
  prompt: string;
  generatedCode: string;
  previewUrl?: string;
  v0MessageId?: string;
}) {
  try {
    // Get current version count
    const { data: latestVersion, error: fetchError } = await supabase
      .from("project_versions")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const newVersion = (latestVersion?.version || 0) + 1;

    // Insert new version
    const { data: version, error: insertError } = await supabase
      .from("project_versions")
      .insert({
        project_id: projectId,
        version: newVersion,
        prompt,
        generated_code: generatedCode,
        preview_url: previewUrl,
        v0_message_id: v0MessageId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update project's current version
    const { error: updateError } = await supabase
      .from("projects")
      .update({ current_version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return version;
  } catch (error) {
    console.error("⚠️ Database: Failed to add project version.");
    console.error("Error details:", error);
    return null;
  }
}

/** Gets all versions for a project. */
export async function getProjectVersions({ projectId }: { projectId: string }) {
  try {
    const { data, error } = await supabase
      .from("project_versions")
      .select()
      .eq("project_id", projectId)
      .order("version", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get project versions from database:", error);
    throw error;
  }
}

/** Gets a specific version of a project. */
export async function getProjectVersion({
  projectId,
  version,
}: {
  projectId: string;
  version: number;
}) {
  try {
    const { data, error } = await supabase
      .from("project_versions")
      .select()
      .eq("project_id", projectId)
      .eq("version", version)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get project version from database:", error);
    throw error;
  }
}

// ============ Chat Message Functions ============

/** Saves a single chat message to the database. */
export async function saveChatMessage({
  chatId,
  role,
  content,
}: {
  chatId: string;
  role: "user" | "model";
  content: string;
}) {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        role,
        content,
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn(`⚠️ Database: Failed to save ${role} message. History might be incomplete.`);
    console.error("Error details:", error);
    return null;
  }
}

/** Gets all messages for a given chat ID, sorted by creation date. */
export async function getChatMessages({ chatId }: { chatId: string }) {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get chat messages from database:", error);
    throw error;
  }
}

/** Deletes a project and all its versions. */
export async function deleteProject({ projectId }: { projectId: string }) {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete project from database:", error);
    throw error;
  }
}

// ============ Project Files Functions ============

/** Saves multiple files for a project version. */
export async function saveProjectFiles({
  projectId,
  version,
  files,
}: {
  projectId: string;
  version: number;
  files: Array<{
    filePath: string;
    fileContent: string;
    fileType?: string;
  }>;
}) {
  try {
    const fileRecords = files.map((file) => ({
      project_id: projectId,
      version,
      file_path: file.filePath,
      file_content: file.fileContent,
      file_type: file.fileType,
    }));

    const { data, error } = await supabase
      .from("project_files")
      .insert(fileRecords)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("⚠️ Database: Failed to save project files. Code view will be empty.");
    console.error("Error details:", error);
    return [];
  }
}

/** Gets all files for a project version. */
export async function getProjectFiles({
  projectId,
  version,
}: {
  projectId: string;
  version?: number;
}) {
  try {
    let query = supabase.from("project_files").select().eq("project_id", projectId);

    if (version !== undefined) {
      query = query.eq("version", version);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get project files from database:", error);
    throw error;
  }
}

/** Updates a single project file. */
export async function updateProjectFile({
  fileId,
  fileContent,
}: {
  fileId: string;
  fileContent: string;
}) {
  try {
    const { data, error } = await supabase
      .from("project_files")
      .update({ file_content: fileContent })
      .eq("id", fileId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update project file in database:", error);
    throw error;
  }
}

/** Deletes a project file. */
export async function deleteProjectFile({ fileId }: { fileId: string }) {
  try {
    const { error } = await supabase
      .from("project_files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete project file from database:", error);
    throw error;
  }
}
