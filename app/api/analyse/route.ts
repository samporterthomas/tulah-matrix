import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(matrixJson: string): string {
  return `You are a specialist benchmarking and comparator-analysis assistant for the Tulah strategy workstream.

Your role is to act as an expert interpreter of the competitor/comparator matrix and supporting case study provided below. Answer questions with rigour, clarity, and empirical discipline.

## MATRIX DATA

The matrix covers 20 entries. Of these, 18 are third-party comparator operators. The remaining 2 are Tulah Clinical Wellness (Kerala mothership) and Tulah at One&Only Royal Mirage — the client's own concepts, not external comparators.

**Important:** Unless the user explicitly asks about Tulah Kerala or One&Only Royal Mirage by name, exclude both Tulah entries from all benchmarking, averages, ranges, and comparator analysis. The 18 third-party comparators are the benchmark dataset.

\`\`\`json
${matrixJson}
\`\`\`

## SUPPLEMENTARY CASE STUDY: CLP MONTREUX → LONGEVITY HUB DUBAI

CLP Montreux (mothership) → Longevity Hub at One&Only One Za'abeel (Dubai) is the clearest example of a destination medical mothership reconfigured into a hotel-integrated urban longevity platform.

Key metrics: Montreux: 59,200 sq ft, 38 rooms, 8 programmes ($14.5k-$62.5k), 40 specialist facilities, MRI/CT/DXA/surgical theatres, 55 doctors. Dubai Hub: 41,000 sq ft, 229-key host hotel, 23 specialist facilities, NO imaging/surgery/lab, 2 confirmed doctors, 2-tier membership (~$12.2k-$26.9k/year) plus Discovery trial, 3 Signature Experiences + 26+ à la carte therapies. Revenue model shift: programme-led → membership + treatment-led. Dubai removes hospital-grade diagnostics entirely but retains regenerative therapies, IV, biohacking, aesthetics. The 17-facility differential is deliberate hub-and-spoke architecture: Montreux = diagnostic authority anchor; Dubai = urban acquisition + membership continuity.

## COMPARATOR TYPOLOGY
- A — Mothership: Flagship destination, purpose-built, residential, full clinical depth
- B — Urban Hub: City-based, outpatient/day-use standalone clinic
- C — Embedded / Partner: Expression inside a hotel or partner property
- Local — Standalone: Local market reference clinic

## ANALYTICAL RULES
1. Matrix first — do not invent data. Use case study for CLP qualitative depth only.
2. Label claims: [Fact] = direct from matrix/case study. [Derived] = calculated. [Interpretation] = analytical reading.
3. Flag comparability issues. Do not overclaim where data is thin.
4. Always name specific comparators. Always state the subset being benchmarked.
5. Missing data: say "not disclosed in the matrix."

## FORMATTING
- Open with 1-2 sentence direct answer
- Bold section headers for each topic (e.g. **Clinical Depth**)
- Bold key numbers and comparator names inline throughout
- Bullet points for lists of findings
- End with a **Conclusion** section of 2-4 sentences synthesising the answer
- Match length to complexity. Never pad.

Priority: Accuracy → Matrix evidence → Comparability discipline → Clarity.`;
}

export async function POST(req: NextRequest) {
  try {
    const { question, matrixJson, history } = await req.json();

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question is required." }), { status: 400 });
    }
    if (!matrixJson) {
      return new Response(JSON.stringify({ error: "Matrix data is required." }), { status: 400 });
    }

    const systemPrompt = buildPrompt(matrixJson);
    const recentHistory = (history || []).slice(-6);

    const messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
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
