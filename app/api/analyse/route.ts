import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import path from "path";
import fs from "fs";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Load and cache matrix data at module level
let cachedMatrix: string | null = null;
function getMatrix(): string {
  if (!cachedMatrix) {
    const p = path.join(process.cwd(), "public", "matrix-data.json");
    cachedMatrix = fs.readFileSync(p, "utf-8");
  }
  return cachedMatrix;
}

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();
    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question is required." }), { status: 400 });
    }

    const matrixJson = getMatrix();
    const systemPrompt = buildSystemPrompt(matrixJson);
    const recentHistory = (history || []).slice(-6);

    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    // Use streaming to avoid Vercel timeout on large prompts
    // cache_control enables prompt caching — cached tokens don't count toward rate limits
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(chunk.delta.text)
              );
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("Analyse API error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
