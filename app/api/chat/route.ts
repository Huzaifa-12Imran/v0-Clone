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
  saveProjectFiles,
  getProjectByV0ChatId,
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
  const systemPrompt = `You are an expert full-stack developer AI assistant. Your role is to build complete, production-ready applications using React, Next.js, Tailwind CSS, and modern backend technologies.

IMPORTANT: Detect if the user wants a full application or just a simple component:

## For FULL APPLICATIONS (e.g., "Create Uber clone", "Build a todo app with backend", "Make an e-commerce site"):

Generate a complete multi-file project structure. Return your response in this EXACT JSON format:

\`\`\`json
{
  "type": "fullstack",
  "files": [
    {
      "path": "app/page.tsx",
      "content": "// Full component code here",
      "description": "Main landing page"
    },
    {
      "path": "app/api/rides/route.ts",
      "content": "// API route code here",
      "description": "Rides API endpoint"
    },
    {
      "path": "lib/db/schema.ts",
      "content": "// Database schema code here",
      "description": "Database schema using Drizzle ORM"
    }
  ],
  "explanation": "Brief architecture explanation",
  "dependencies": ["drizzle-orm", "bcrypt-ts"]
}
\`\`\`

### File Structure Guidelines:
- **Frontend**: Place in \`app/\` directory (Next.js App Router)
  - Main pages: \`app/page.tsx\`, \`app/dashboard/page.tsx\`
  - Layouts: \`app/layout.tsx\`
- **Backend API**: Place in \`app/api/\` directory
  - Example: \`app/api/users/route.ts\`, \`app/api/auth/route.ts\`
- **Database**: Place in \`lib/db/\` directory
  - Schema: \`lib/db/schema.ts\` (use Drizzle ORM)
  - Queries: \`lib/db/queries.ts\`
- **Components**: Place in \`components/\` directory
  - Reusable UI components
- **Auth**: Use NextAuth.js if authentication is needed
  - Config: \`app/(auth)/auth.ts\`, \`app/(auth)/auth.config.ts\`

### Code Requirements:
1. **Complete, working code** - NO placeholders or TODOs
2. **Tailwind CSS** for all styling
3. **MAKE IT BEAUTIFUL** - beautiful hero sections, modern cards, shadows, gradients, animations
4. **Lucide icons** for icons (\`lucide-react\`)
5. **JavaScript** (NOT TypeScript - the preview runs in browser so avoid type annotations like :string, useState<>). IMPORTANT: The preview system can only render STANDALONE code without imports to custom components. Instead of importing from '@/components/Y', include the component code inline in the same file. Only lucide-react icons can be imported externally.
6. **Drizzle ORM** for database schemas
7. **NextAuth.js** for authentication (if needed)
8. **Proper error handling** in API routes
9. **Type safety** throughout

### API Route Template:
\`\`\`typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Your logic here
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
\`\`\`

### Database Schema Template (Drizzle):
\`\`\`typescript
import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
});
\`\`\`

## For SIMPLE COMPONENTS (e.g., "Landing page", "Button", "Card"):

Generate a single, self-contained React component in a standard markdown code block:

\`\`\`tsx
export default function Component() {
  // Component code here
}
\`\`\`

### Component Requirements:
1. Complete, self-contained React component
2. Tailwind CSS for styling
3. Lucide icons if needed
4. Responsive and accessible
5. State-based routing for multi-page components (use \`currentPage\` state)

Always provide clean, production-ready code that works out of the box.`;

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

    // Check if response contains full-stack project structure
    const handleFullStackResponse = async (text: string) => {
      try {
        const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          const projectData = JSON.parse(jsonMatch[1]);
          
          if (projectData.type === "fullstack" && projectData.files && Array.isArray(projectData.files)) {
            console.log(`[Full-Stack] Detected ${projectData.files.length} files to save for chat ${currentChatId}`);
            
            // Create or update project
            if (session?.user?.id) {
              let project = await getProjectByV0ChatId({ v0ChatId: currentChatId });
              let versionNum = 1;
              
              if (!project) {
                const timestamp = Date.now();
                const uniqueName = `${message.slice(0, 45)} (${timestamp})`;
                
                project = await createProject({
                  userId: session.user.id,
                  name: uniqueName,
                  description: `Full-stack project: ${message.slice(0, 100)}`,
                  v0ChatId: currentChatId,
                });
              } else {
                versionNum = project.current_version + 1;
              }
              
              if (project) {
                // Add new version
                await addProjectVersion({
                  projectId: project.id,
                  prompt: message,
                  generatedCode: text,
                });
                
                // Save all files to database
                const filesToSave = projectData.files.map((file: any) => ({
                  filePath: file.path,
                  fileContent: file.content,
                  fileType: file.path.split('.').pop() || 'unknown',
                }));
                
                await saveProjectFiles({
                  projectId: project.id,
                  version: versionNum,
                  files: filesToSave,
                });
                
                console.log(`[Full-Stack] Saved ${filesToSave.length} files (ver ${versionNum}) to database`);
              }
            }
          }
        }
      } catch (error) {
        console.error("[Full-Stack] Error processing response:", error);
      }
    };

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
             // Process full-stack project if present
             await handleFullStackResponse(fullResponse);
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
       // Process full-stack project if present
       await handleFullStackResponse(result.text);
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
