-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "v0_chat_id" varchar(255),
  "current_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "projects_user_id_name_unique" UNIQUE ("user_id", "name")
);

-- Create project_versions table
CREATE TABLE IF NOT EXISTS "project_versions" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "prompt" text NOT NULL,
  "generated_code" text NOT NULL,
  "preview_url" varchar(512),
  "v0_message_id" varchar(255),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_versions_project_id_version_unique" UNIQUE ("project_id", "version")
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects"("user_id");
CREATE INDEX IF NOT EXISTS "project_versions_project_id_idx" ON "project_versions"("project_id");
