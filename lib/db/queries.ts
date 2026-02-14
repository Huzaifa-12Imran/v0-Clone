import "server-only";

import { and, count, desc, eq, gte, asc } from "drizzle-orm";
import db from "./connection";
import { chat_ownerships, type User, users, projects, project_versions, chat_messages } from "./schema";
import { generateHashedPassword } from "./utils";

/**
 * Gets the database instance, throwing if not initialized.
 * @throws Error if POSTGRES_URL is not set
 */
function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Ensure POSTGRES_URL is set.");
  }

  return db;
}

/** Retrieves a user by email address. */
export async function getUser(email: string): Promise<User[]> {
  try {
    return await getDb().select().from(users).where(eq(users.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
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
    return await getDb()
      .insert(users)
      .values({
        email,
        password: hashedPassword,
      })
      .returning();
  } catch (error) {
    console.error("Failed to create user in database");
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
    return await getDb()
      .insert(chat_ownerships)
      .values({
        v0_chat_id: v0ChatId,
        user_id: userId,
      })
      .onConflictDoNothing({ target: chat_ownerships.v0_chat_id });
  } catch (error) {
    console.error("Failed to create chat ownership in database");
    throw error;
  }
}

/** Gets the ownership record for a v0 chat ID. */
export async function getChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    const [ownership] = await getDb()
      .select()
      .from(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, v0ChatId));
    return ownership;
  } catch (error) {
    console.error("Failed to get chat ownership from database");
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
    const ownerships = await getDb()
      .select({ v0ChatId: chat_ownerships.v0_chat_id })
      .from(chat_ownerships)
      .where(eq(chat_ownerships.user_id, userId))
      .orderBy(desc(chat_ownerships.created_at));

    return ownerships.map((o: { v0ChatId: string }) => o.v0ChatId);
  } catch (error) {
    console.error("Failed to get chat IDs by user from database");
    throw error;
  }
}

/** Deletes the ownership record for a v0 chat ID. */
export async function deleteChatOwnership({ v0ChatId }: { v0ChatId: string }) {
  try {
    return await getDb()
      .delete(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, v0ChatId));
  } catch (error) {
    console.error("Failed to delete chat ownership from database");
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
    const hoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    const [stats] = await getDb()
      .select({ count: count(chat_ownerships.id) })
      .from(chat_ownerships)
      .where(
        and(
          eq(chat_ownerships.user_id, userId),
          gte(chat_ownerships.created_at, hoursAgo),
        ),
      );

    return stats?.count || 0;
  } catch (error) {
    console.error("Failed to get chat count by user from database");
    throw error;
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
    const [project] = await getDb()
      .insert(projects)
      .values({
        user_id: userId,
        name,
        description,
        v0_chat_id: v0ChatId,
      })
      .returning();
    return project;
  } catch (error) {
    console.error("Failed to create project in database");
    throw error;
  }
}

/** Gets all projects for a user. */
export async function getProjectsByUserId({ userId }: { userId: string }) {
  try {
    return await getDb()
      .select()
      .from(projects)
      .where(eq(projects.user_id, userId))
      .orderBy(desc(projects.updated_at));
  } catch (error) {
    console.error("Failed to get projects from database");
    throw error;
  }
}

/** Gets a single project by ID. */
export async function getProjectById({ projectId }: { projectId: string }) {
  try {
    const [project] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    return project;
  } catch (error) {
    console.error("Failed to get project from database");
    throw error;
  }
}

/** Adds a new version to a project. */
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
    const [latestVersion] = await getDb()
      .select({ version: project_versions.version })
      .from(project_versions)
      .where(eq(project_versions.project_id, projectId))
      .orderBy(desc(project_versions.version))
      .limit(1);

    const newVersion = (latestVersion?.version || 0) + 1;

    // Insert new version
    const [version] = await getDb()
      .insert(project_versions)
      .values({
        project_id: projectId,
        version: newVersion,
        prompt,
        generated_code: generatedCode,
        preview_url: previewUrl,
        v0_message_id: v0MessageId,
      })
      .returning();

    // Update project's current version
    await getDb()
      .update(projects)
      .set({ current_version: newVersion, updated_at: new Date() })
      .where(eq(projects.id, projectId));

    return version;
  } catch (error) {
    console.error("Failed to add project version to database");
    throw error;
  }
}

/** Gets all versions for a project. */
export async function getProjectVersions({ projectId }: { projectId: string }) {
  try {
    return await getDb()
      .select()
      .from(project_versions)
      .where(eq(project_versions.project_id, projectId))
      .orderBy(asc(project_versions.version));
  } catch (error) {
    console.error("Failed to get project versions from database");
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
    const [projectVersion] = await getDb()
      .select()
      .from(project_versions)
      .where(
        and(
          eq(project_versions.project_id, projectId),
          eq(project_versions.version, version),
        ),
      );
    return projectVersion;
  } catch (error) {
    console.error("Failed to get project version from database");
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
    return await getDb()
      .insert(chat_messages)
      .values({
        chat_id: chatId,
        role,
        content,
      })
      .returning();
  } catch (error) {
    console.error("Failed to save chat message to database:", error);
    throw error;
  }
}

/** Gets all messages for a given chat ID, sorted by creation date. */
export async function getChatMessages({ chatId }: { chatId: string }) {
  try {
    return await getDb()
      .select({
        role: chat_messages.role,
        content: chat_messages.content,
      })
      .from(chat_messages)
      .where(eq(chat_messages.chat_id, chatId))
      .orderBy(asc(chat_messages.created_at));
  } catch (error) {
    console.error("Failed to get chat messages from database:", error);
    throw error;
  }
}

/** Deletes a project and all its versions. */
export async function deleteProject({ projectId }: { projectId: string }) {
  try {
    return await getDb()
      .delete(projects)
      .where(eq(projects.id, projectId));
  } catch (error) {
    console.error("Failed to delete project from database");
    throw error;
  }
}
