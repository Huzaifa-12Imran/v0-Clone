import { type NextRequest, NextResponse } from "next/server";
import { deleteChatOwnership } from "@/lib/db/queries";
import { getChatStore } from "@/lib/chat-store";

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    // Delete from in-memory store
    const chatStore = getChatStore();
    chatStore.delete(chatId);

    // Delete ownership record
    try {
      await deleteChatOwnership({ v0ChatId: chatId });
    } catch (error) {
      console.error("Error deleting chat ownership:", error);
    }

    return NextResponse.json({ success: true, message: "Chat deleted" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 },
    );
  }
}
