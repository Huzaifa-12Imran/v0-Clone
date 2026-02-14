import { type NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/app/(auth)/auth";
import {
  createChatOwnership,
  getChatCountByUserId,
  getChatOwnership,
  saveChatMessage,
  createProject,
  addProjectVersion,
  getChatMessages,
} from "@/lib/db/queries";
import { userEntitlements } from "@/lib/entitlements";
import { ChatSDKError } from "@/lib/errors";
import { type ChatMessage, getChatStore, generateChatId } from "@/lib/chat-store";
import { type MessageBinaryFormat } from "@v0-sdk/react";

// Gemini API configuration - using the user's project
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GEMINI_PROJECT = "projects/1054993645110";

interface ChatDetail {
  id: string;
  demo?: boolean;
  messages?: Array<{
    role: string;
    content: string;
    [key: string]: unknown;
  }>;
}

const STREAMING_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

async function checkRateLimit(
  session: Session | null,
): Promise<Response | null> {
  // Require authentication
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chatCount = await getChatCountByUserId({
    userId: session.user.id,
    differenceInHours: 24,
  });

  if (chatCount >= userEntitlements.maxMessagesPerDay) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  return null;
}

function createStreamingResponse(
  stream: ReadableStream<Uint8Array>,
  chatId?: string,
): Response {
  return new Response(stream, {
    headers: {
      ...STREAMING_HEADERS,
      ...(chatId && { "X-Chat-ID": chatId }),
    },
  });
}

async function generateWithGemini(
  messages: ChatMessage[],
  apiKey: string,
  streaming: boolean = false,
): Promise<{ text: string; stream?: ReadableStream<Uint8Array> }> {
  const systemPrompt = `You are an expert web developer AI assistant, similar to v0. Your role is to build beautiful, responsive, and production-ready websites using React, Next.js, and Tailwind CSS.

When a user asks you to create or modify code:
1. Generate complete, self-contained React components. DO NOT use placeholders or empty functions.
2. ALWAYS use Tailwind CSS for all styling. Do not use external CSS files.
3. For icons: Use the provided 'Lucide' library. Access icons as <Lucide.IconName /> or import them from 'lucide-react' (stripping imports is handled by the system). Ensure every icon used is a valid Lucide icon name.
4. Make sure the code is modern, accessible, and responsive.
5. Provide a single, clear code block containing the main component. If you need helpers, put them in the same block.
6. Explain your technical choices briefly after the code.
7. If the user requests multiple pages or working subpages, implement a state-based router WITHIN the component (e.g., using a 'currentPage' state) to switch between different views, as the preview environment does not support real server-side routing or multiple files.

For any web preview request, ensure the component can be rendered independently in a standard React environment.`;

  // Build conversation history
  const conversationHistory = messages
    .slice(-10) // Keep last 10 messages for context
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

  const requestBody: Record<string, unknown> = {
    contents: conversationHistory,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 20480,
      topP: 0.95,
      topK: 40,
    },
  };

  if (streaming) {
    // For streaming, use the streamGenerateContent endpoint
    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
    
    console.log("=== STREAMING REQUEST ===");
    console.log("URL:", streamUrl.replace(apiKey, "***API_KEY***"));
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    console.log("========================");
    
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API streaming error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Process SSE data
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
        }
        controller.close();
      },
    });

    return { text: "", stream };
  }

  // Non-streaming request
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return { text };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { message, chatId, streaming } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const rateLimitResponse = await checkRateLimit(session);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Get or create chat history
    const chatStore = getChatStore();
    const currentChatId = chatId || generateChatId();
    let history = chatStore.get(currentChatId) || [];

    // Restore history from DB if in-memory store is empty for an existing chat
    if (chatId && history.length === 0) {
      console.log(`[Chat] Restoring history for chat: ${chatId}`);
      const dbMessages = await getChatMessages({ chatId });
      if (dbMessages && dbMessages.length > 0) {
          history = dbMessages.map(m => ({ 
              role: m.role as "user" | "model", 
              content: m.content 
          }));
          chatStore.set(currentChatId, history);
          console.log(`[Chat] Restored ${history.length} messages from DB`);
      }
    }

    // Ensure ownership exists for persistence
    if (!chatId && session?.user?.id) {
      await createChatOwnership({ v0ChatId: currentChatId, userId: session.user.id });
    }

    // Add user message to history
    const userMessage: ChatMessage = { role: "user", content: message };
    history.push(userMessage);
    
    // Save user message to DB
    if (session?.user?.id) {
       await saveChatMessage({ chatId: currentChatId, role: "user", content: message });
    }

    // Generate response with Gemini
    const result = await generateWithGemini(history, apiKey, streaming);

    if (streaming && result.stream) {
      // For streaming, we need to handle it differently
      let fullResponse = "";
      
      const transformedStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = result.stream!.getReader();
          let chunkCount = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              fullResponse += chunk;
              controller.enqueue(value);

              // Update store every 10 chunks to allow real-time preview
              chunkCount++;
              if (chunkCount % 10 === 0) {
                const tempHistory: ChatMessage[] = [...history, { role: "model", content: fullResponse }];
                chatStore.set(currentChatId, tempHistory);
              }
            }
          } catch (error) {
            console.error("Stream error:", error);
          }
          
          // Add final assistant response to history and DB after streaming completes
          const assistantMessage: ChatMessage = { role: "model", content: fullResponse };
          history.push(assistantMessage);
          chatStore.set(currentChatId, history);
          
          if (session?.user?.id && fullResponse) {
             await saveChatMessage({ chatId: currentChatId, role: "model", content: fullResponse });
          }
          
          controller.close();
        },
      });

      return createStreamingResponse(transformedStream, currentChatId);
    }

    const assistantMessage: ChatMessage = { role: "model", content: result.text };
    history.push(assistantMessage);
    chatStore.set(currentChatId, history);
    
    // Save assistant message to DB
    if (session?.user?.id && result.text) {
       await saveChatMessage({ chatId: currentChatId, role: "model", content: result.text });
    }

    const chatDetail: ChatDetail = {
      id: currentChatId,
      messages: history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // Create project for new chats (if not already handled)
    if (!chatId && session?.user?.id) {
      try {
        const timestamp = Date.now();
        const uniqueName = `${message.slice(0, 45)} (${timestamp})`;
        
        const project = await createProject({
          userId: session.user.id,
          name: uniqueName,
          description: `Project generated from: ${message.slice(0, 100)}`,
          v0ChatId: currentChatId,
        });
        
        if (project) {
          await addProjectVersion({
            projectId: project.id,
            prompt: message,
            generatedCode: result.text || "",
          });
        }
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    }

    return NextResponse.json({
      id: chatDetail.id,
      demo: chatDetail.demo,
      messages: chatDetail.messages,
    });
  } catch (error) {
    console.error("=== CHAT API ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Full error object:", error);
    console.error("======================");
    
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    // Get chat store for GET request
    const chatStore = getChatStore();
    
    if (!chatId) {
      // Return list of user's chats
      const userChats = Array.from(chatStore.entries())
        .filter(([id]) => {
          // In a real app, filter by user ownership
          return true;
        })
        .map(([id, messages]) => ({
          id,
          lastMessage: messages[messages.length - 1]?.content?.slice(0, 100) || "",
          messageCount: messages.length,
        }));

      return NextResponse.json({ chats: userChats });
    }

    // Return specific chat
    const messages = chatStore.get(chatId);
    if (!messages) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: chatId,
      messages,
    });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 },
    );
  }
}
