import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getChatOwnership, getChatMessages } from "@/lib/db/queries";
import { getChatStore } from "@/lib/chat-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  let chatId: string | undefined;
  try {
    const session = await auth();
    const resolvedParams = await params;
    chatId = resolvedParams.chatId;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    if (session?.user?.id) {
      console.log(`[API] Checking ownership for chat ${chatId} and user ${session.user.id}`);
      const ownership = await getChatOwnership({ v0ChatId: chatId });

      if (!ownership) {
        console.warn(`[API] No ownership record found for chat ${chatId} in DB`);
        return NextResponse.json({ error: "Chat ownership not found in database" }, { status: 404 });
      }

      if (ownership.user_id !== session.user.id) {
        console.warn(`[API] User ${session.user.id} tried to access unauthorized chat ${chatId}`);
        return NextResponse.json({ error: "Forbidden: You do not own this chat" }, { status: 403 });
      }
    }

    const chatStore = getChatStore();
    let messages = chatStore.get(chatId);

    if (!messages) {
      console.log(`[API] Chat ${chatId} missing from memory, fetching from DB`);
      const dbMessages = await getChatMessages({ chatId });
      messages = dbMessages.map(m => ({
        role: m.role as "user" | "model",
        content: m.content
      }));

      if (messages.length > 0) {
        chatStore.set(chatId, messages);
      }
    }

    const hasCode = messages.some(m => m.content.includes("```"));
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        id: chatId,
        messages: [],
        demo: hasCode ? `/api/preview/${chatId}` : undefined,
        note: "Chat found but has no message history"
      });
    }

    return NextResponse.json({
      id: chatId,
      messages: messages,
      demo: hasCode ? `/api/preview/${chatId}` : undefined,
    });
  } catch (error) {
    console.error(`[API] Fetch Error for chat ${chatId || 'unknown'}:`, error);

    return NextResponse.json(
      {
        error: "Failed to fetch chat details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
