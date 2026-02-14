import "server-only";

import { getChatIdsByUserId } from "@/lib/db/queries";
import { getChatStore } from "@/lib/chat-store";

export interface Project {
  id: string;
  name: string;
  demoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

function getProjectName(messages: ChatMessage[]): string {
  const firstUserMessage = messages?.find((msg) => msg.role === "user");
  return firstUserMessage?.content?.slice(0, 50) || "Untitled Project";
}

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  const userChatIds = await getChatIdsByUserId({ userId });

  if (userChatIds.length === 0) {
    return [];
  }

  const chatStore = getChatStore();
  const now = new Date().toISOString();

  const userProjects: Project[] = [];

  for (const chatId of userChatIds) {
    const messages = chatStore.get(chatId);
    if (messages) {
      userProjects.push({
        id: chatId,
        name: getProjectName(messages),
        demoUrl: null, // Gemini doesn't generate live previews
        createdAt: now,
        updatedAt: now,
        messageCount: messages.length,
      });
    }
  }

  return userProjects;
}
