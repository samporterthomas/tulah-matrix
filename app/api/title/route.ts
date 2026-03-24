import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) return NextResponse.json({ title: "New conversation" });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [{
        role: "user",
        content: `Generate a short 3-6 word title for a chat that started with this question. Return only the title, no punctuation, no quotes:\n\n${question}`,
      }],
    });

    const title = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 60);

    return NextResponse.json({ title: title || "New conversation" });
  } catch {
    return NextResponse.json({ title: "New conversation" });
  }
}
