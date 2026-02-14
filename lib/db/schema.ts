import type { InferSelectModel } from "drizzle-orm";
import { pgTable, timestamp, unique, uuid, varchar, text, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: varchar("name", { length: 128 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof users>;

// Simple ownership mapping for v0 chats
// The actual chat data lives in v0 API, we just track who owns what
export const chat_ownerships = pgTable(
  "chat_ownerships",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    v0_chat_id: varchar("v0_chat_id", { length: 255 }).notNull(), // v0 API chat ID
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Ensure each v0 chat can only be owned by one user
    unique_v0_chat: unique().on(table.v0_chat_id),
  }),
);

export type ChatOwnership = InferSelectModel<typeof chat_ownerships>;

// Projects table - stores project metadata
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    v0_chat_id: varchar("v0_chat_id", { length: 255 }), // Link to v0 chat
    current_version: integer("current_version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    unique_user_project: unique().on(table.user_id, table.name),
  }),
);

export type Project = InferSelectModel<typeof projects>;

// Project versions table - stores different versions of each project
export const project_versions = pgTable(
  "project_versions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    prompt: text("prompt").notNull(),
    generated_code: text("generated_code").notNull(),
    preview_url: varchar("preview_url", { length: 512 }),
    v0_message_id: varchar("v0_message_id", { length: 255 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    unique_project_version: unique().on(table.project_id, table.version),
  }),
);

export type ProjectVersion = InferSelectModel<typeof project_versions>;

// Table for actual chat message content
export const chat_messages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chat_id: varchar("chat_id", { length: 255 })
    .notNull()
    .references(() => chat_ownerships.v0_chat_id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'model'
  content: text("content").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type ChatMessageDB = InferSelectModel<typeof chat_messages>;
