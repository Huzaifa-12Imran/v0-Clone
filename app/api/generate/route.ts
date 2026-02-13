import { type NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/app/(auth)/auth";
import {
  createProject,
  addProjectVersion,
  getChatCountByUserId,
} from "@/lib/db/queries";
import { userEntitlements } from "@/lib/entitlements";

// Gemini API configuration
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

interface Variant {
  name: string;
  description: string;
  code: string;
}

interface MultiVariantResponse {
  variants: Variant[];
  pages: string[];
}

async function generateWithGemini(
  prompt: string,
  apiKey: string,
): Promise<MultiVariantResponse> {
  const systemPrompt = `You are an expert web developer. Generate a complete multi-page website based on the user's request.

For the given prompt, create 3 completely different design variants:
1. Variant 1: Modern & Bold - Use gradients, bold colors, and contemporary styling
2. Variant 2: Clean & Professional - Use minimal colors, clean typography, corporate style
3. Variant 3: Creative & Playful - Use unique layouts, creative typography, vibrant colors

For each variant, generate the following pages:
- Home (hero section, features, about preview, CTA)
- About (company story, team members, values)
- Services (service offerings with descriptions)
- Portfolio (gallery of past work/projects)
- Contact (contact form, contact info, map placeholder)

Output format - JSON ONLY, no markdown:
{
  "variants": [
    {
      "name": "Modern & Bold",
      "description": "A contemporary design with gradients and bold styling",
      "code": "Full HTML code for all 5 pages in a single file with page tabs navigation"
    }
  ],
  "pages": ["Home", "About", "Services", "Portfolio", "Contact"]
}

Requirements:
- Use Tailwind CSS for styling
- Include smooth animations and transitions
- Make it fully responsive
- Include proper semantic HTML
- Each page should be a complete, functional component
- Use React with Next.js compatible code
- Include a tab navigation system to switch between pages
- The code should be production-ready

Respond with ONLY valid JSON.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: `User Request: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse the JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  return JSON.parse(jsonMatch[0]) as MultiVariantResponse;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { message, variant = "all", page = "Home" } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Require authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check rate limit
    const chatCount = await getChatCountByUserId({
      userId: session.user.id,
      differenceInHours: 24,
    });

    if (chatCount >= userEntitlements.maxMessagesPerDay) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Generate multi-variant response
    const result = await generateWithGemini(message, apiKey);

    // Create a project for this generation
    const project = await createProject({
      userId: session.user.id,
      name: message.slice(0, 50) || "Multi-Variant Project",
      description: `3 variants: ${result.variants.map((v) => v.name).join(", ")}`,
    });

    // Save each variant as a version
    for (const variant of result.variants) {
      await addProjectVersion({
        projectId: project!.id,
        prompt: `${variant.name}: ${variant.description}`,
        generatedCode: variant.code,
        previewUrl: undefined,
      });
    }

    return NextResponse.json({
      projectId: project!.id,
      variants: result.variants,
      pages: result.pages,
    });
  } catch (error) {
    console.error("Generation Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
