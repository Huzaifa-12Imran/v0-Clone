import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getChatIdsByUserId, getChatMessages } from "@/lib/db/queries";
import { getChatStore } from "@/lib/chat-store";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.log("[API] No session found, returning empty chat list");
      return NextResponse.json({ data: [] });
    }

    console.log(`[API] Fetching chats for user: ${session.user.id}`);
    const userChatIds = await getChatIdsByUserId({ userId: session.user.id });
    console.log(`[API] Found ${userChatIds.length} chat IDs in DB`);

    const chatStore = getChatStore();
    
    // Fetch details for each chat (DB based)
    const userChats = await Promise.all(
      userChatIds.map(async (chatId) => {
        // Sync memory store if missing
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

        return {
          id: chatId,
          messages: messages,
          lastMessage: messages[messages.length - 1]?.content?.slice(0, 100) || "",
          demo: messages.some(m => m.content.includes("```")) ? `/api/preview/${chatId}` : undefined,
        };
      })
    );

    return NextResponse.json({ data: userChats });
  } catch (error) {
    console.error("[API] Chats fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch chats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
