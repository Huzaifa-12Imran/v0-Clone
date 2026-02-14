import { type NextRequest, NextResponse } from "next/server";
import { getChatStore, generateChatId } from "@/lib/chat-store";

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    const chatStore = getChatStore();
    const originalChat = chatStore.get(chatId);

    if (!originalChat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 },
      );
    }

    // Create a fork by copying messages to a new chat ID
    const forkedChatId = generateChatId();
    chatStore.set(forkedChatId, [...originalChat]);

    return NextResponse.json({
      id: forkedChatId,
      messages: originalChat,
    });
  } catch (error) {
    console.error("Error forking chat:", error);
    return NextResponse.json({ error: "Failed to fork chat" }, { status: 500 });
  }
}
