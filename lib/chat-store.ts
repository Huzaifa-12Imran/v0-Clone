// Shared in-memory chat storage for Gemini-based chat

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

// In-memory chat storage (shared across routes)
declare global {
  var geminiChatStore: Map<string, ChatMessage[]> | undefined;
}

export function getChatStore(): Map<string, ChatMessage[]> {
  if (!global.geminiChatStore) {
    global.geminiChatStore = new Map();
  }
  return global.geminiChatStore;
}

export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
