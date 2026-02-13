import "server-only";

import { createClient } from "v0-sdk";
import { getChatIdsByUserId } from "@/lib/db/queries";

const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {},
);

export interface Project {
  id: string;
  name: string;
  demoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface V0Chat {
  id: string;
  name?: string;
  demo?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{ role: string; content: string }>;
}

function getProjectName(chat: V0Chat): string {
  if (chat.name) {
    return chat.name;
  }
  const firstUserMessage = chat.messages?.find((msg) => msg.role === "user");
  return firstUserMessage?.content?.slice(0, 50) || "Untitled Project";
}

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  const userChatIds = await getChatIdsByUserId({ userId });

  if (userChatIds.length === 0) {
    return [];
  }

  const allChats = await v0.chats.find();
  const userChats =
    (allChats.data as V0Chat[])?.filter((chat) =>
      userChatIds.includes(chat.id),
    ) || [];

  return userChats.map((chat) => ({
    id: chat.id,
    name: getProjectName(chat),
    demoUrl: chat.demo || null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messageCount: chat.messages?.length || 0,
  }));
}
