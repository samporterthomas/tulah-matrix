import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import type { AnalyseRequest } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body: AnalyseRequest = await req.json();
    const { question, matrixData, history } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }
    if (!matrixData?.records?.length) {
      return NextResponse.json(
        { error: "No matrix data provided. Please upload a matrix file first." },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(matrixData);

    // Build message history — include up to last 10 turns to stay within context
    const recentHistory = history.slice(-10);
    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const answer =
      response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("\n") || "No response generated.";

    return NextResponse.json({ answer });
  } catch (err: unknown) {
    console.error("Analyse API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
