import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(
  description: string,
  intake: Record<string, string> | null,
): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const reportId = `PM-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const intakeBlock = intake
    ? `
Additional pet information provided:
- Species: ${intake.species || 'Unknown'}
- Breed: ${intake.breed || 'Unknown'}
- Age: ${intake.age || 'Unknown'}
- Weight: ${intake.weight || 'Unknown'}
- Sex: ${intake.sex || 'Unknown'}
- Diagnosis / suspected diagnosis: ${intake.diagnosis || 'Not provided'}
- Treatment options mentioned by vet: ${intake.treatmentOptions || 'Not provided'}
- Owner's top priority: ${intake.priority || 'Not specified'}
- Budget: ${intake.budget || 'Not specified'}
- Tolerance for frequent vet visits: ${intake.visitFreq || 'Not specified'}
`
    : '';

  return `You are a veterinary medical decision-support specialist.
A pet owner has submitted the following information. Generate a structured decision guide in JSON format.

IMPORTANT: Detect the language of the owner's description and generate ALL text fields in that exact same language. If the description is in English, respond in English. If in Chinese, respond in Chinese. If in any other language, respond in that language.

Owner's description:
"${description}"
${intakeBlock}
Date: ${dateStr}

Return ONLY a valid JSON object with this EXACT structure. No markdown, no code fences, no explanation:

{
  "report_id": "${reportId}",
  "date": "${dateStr}",
  "submitted": "${now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}",
  "completed": "${now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}",
  "diagnosis_plain": "Plain-language diagnosis summary (1-2 sentences)",
  "pet": {
    "breed": "Inferred or stated breed",
    "sex": "Inferred or stated sex",
    "age": "Inferred or stated age",
    "weight": "Inferred or stated weight",
    "chief_complaint": "Main concern from description",
    "clinic": "Clinic if mentioned, else 'Veterinary Clinic'",
    "report_type": "Type of exam or report mentioned",
    "vet": "Vet name if mentioned, else 'Attending Veterinarian'",
    "history": "Relevant history from description"
  },
  "summary": {
    "severity": "Severity level and brief reason",
    "findings_count": "N key findings reviewed",
    "decision_window": "Urgency and timeline description",
    "prognosis": "Overall prognosis summary",
    "paths": "N paths: brief description of each",
    "priority_match": "How the options align with owner priorities",
    "next_step": "Single most important immediate action"
  },
  "findings": [
    { "name": "Finding name", "value": "Measured value", "range": "Normal range", "deviation": "Normal or ↑ Mild or ↑ Moderate or ↑ Severe or ↓ Low", "meaning": "Plain-language explanation" }
  ],
  "paths": [
    { "label": "Option A", "approach": "Treatment name", "survival": "Prognosis/survival context", "cost": "Estimated cost range", "aligns": "What this option aligns with for this owner", "tensions": "What concerns or conflicts this option raises" },
    { "label": "Option B", "approach": "Treatment name", "survival": "Prognosis/survival context", "cost": "Estimated cost range", "aligns": "What this option aligns with for this owner", "tensions": "What concerns or conflicts this option raises" }
  ],
  "prognosis_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "prognosis_note": "Important caveat or limitation to keep in mind",
  "questions": ["Question to ask vet 1", "Question 2", "Question 3", "Question 4", "Question 5"],
  "sources": ["Guideline or reference 1", "Reference 2"]
}

Generate 3–6 findings based on the described exam/report. Generate 2–3 treatment paths.`;
}

export async function POST(req: NextRequest) {
  try {
    const { description, intake } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const prompt = buildPrompt(description, intake ?? null);

    // Stream Claude's output directly to the client so Vercel's 25s
    // "initial response" timer is satisfied within the first token (~1-2s).
    const claudeStream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.3,
      stream: true,
      system: 'You are a veterinary medical report generator. You must respond with valid JSON only, no markdown, no explanation, no code fences.',
      messages: [{ role: 'user', content: prompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of claudeStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          // Encode error as a sentinel the client can detect
          controller.enqueue(
            encoder.encode(`\n{"__stream_error":"${String(err).replace(/"/g, '\\"')}"}`),
          );
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('generate-report error:', error);
    return NextResponse.json({ error: 'Failed to generate report', detail: String(error) }, { status: 500 });
  }
}
