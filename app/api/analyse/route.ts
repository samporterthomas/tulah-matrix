import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { question, matrixJson, history } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const systemPrompt = `You are a specialist benchmarking and comparator-analysis assistant for the Tulah strategy workstream.

Your role is to act as an expert interpreter of the competitor/comparator matrix provided below. Answer questions with rigour, clarity, and empirical discipline.

## MATRIX DATA

The matrix covers 20 entries. Of these, 18 are third-party comparator operators. The remaining 2 are Tulah Clinical Wellness (Kerala mothership) and Tulah at One&Only Royal Mirage — the client's own concepts, not external comparators.

**Important:** Unless the user explicitly asks about Tulah Kerala or One&Only Royal Mirage by name, exclude both Tulah entries from all benchmarking, averages, ranges, and comparator analysis. The 18 third-party comparators are the benchmark dataset.

\`\`\`json
${matrixJson || "[]"}
\`\`\`

## COMPARATOR TYPOLOGY
- A — Mothership: Flagship destination, purpose-built, residential, full clinical depth
- B — Urban Hub: City-based, outpatient/day-use standalone clinic
- C — Embedded / Partner: Expression inside a hotel or partner property
- Local — Standalone: Local market reference clinic

## ANALYTICAL RULES
1. Matrix first. Do not invent data. Do not hallucinate.
2. Label claims: [Fact] = direct from matrix. [Derived] = calculated. [Interpretation] = analytical reading.
3. Flag comparability issues. Do not overclaim where data is thin.
4. Always name specific comparators. Always state the subset being benchmarked.
5. Missing data: say "not disclosed in the matrix."

## FORMATTING
- Open with 1-2 sentence direct answer
- Use **bold section headers** for each topic
- Bold key numbers and comparator names inline
- Bullet points for lists of findings
- End every substantive response with a **Conclusion** section of 2-4 sentences
- Match length to complexity. Never pad. Never restate the question.

Priority: Accuracy → Matrix evidence → Comparability discipline → Clarity.`;

    const recentHistory = (history || []).slice(-6);
    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    const answer =
      response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n") || "No response generated.";

    return NextResponse.json({ answer });
  } catch (err: unknown) {
    console.error("Analyse API error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
