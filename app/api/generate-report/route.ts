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

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.3,
      system: 'You are a veterinary medical report generator. You must respond with valid JSON only, no markdown, no explanation, no code fences.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text?.trim() ?? '';
    console.log('Claude raw response (first 300 chars):', raw.slice(0, 300));

    // Extract the JSON object by locating the outermost { ... }
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      console.error('No JSON object in response. Raw:', raw.slice(0, 500));
      return NextResponse.json({ error: 'Model returned no JSON', detail: raw.slice(0, 200) }, { status: 500 });
    }

    // Fix common LLM JSON mistakes before parsing
    const cleaned = raw.slice(start, end + 1)
      .replace(/^\uFEFF/, '')                                                  // BOM
      .replace(/[\u201C\u201D\u300C\u300D\u201E\u201F]/g, '"')               // curly/CJK double quotes → "
      .replace(/[\u2018\u2019\u300E\u300F]/g, "'")                           // curly/CJK single quotes → '
      .replace(/：\s*"/g, ': "')                                              // Chinese colon before string
      .replace(/：\s*([0-9[{])/g, ': $1')                                    // Chinese colon before number/array/obj
      .replace(/,(\s*[}\]])/g, '$1')                                          // trailing commas
      .replace(/,(\s*,)+/g, ',')                                              // duplicate commas
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')       // unquoted keys
      .replace(/":\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, '": "$1"')               // single-quoted values
      .replace(/:\s*undefined\b/g, ': null')                                  // undefined → null
      .replace(/:\s*None\b/g, ': null')                                       // Python None → null
      .replace(/:\s*NaN\b/g, ': null')                                        // NaN → null
      .replace(/:\s*Infinity\b/g, ': null')                                   // Infinity → null
      .replace(/:\s*True\b/g, ': true')                                       // Python True → true
      .replace(/:\s*False\b/g, ': false')                                     // Python False → false
      .replace(/\\'/g, "'")                                                    // invalid escaped single quote

    let report: unknown;
    try {
      report = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON.parse failed:', parseErr, '\nCleaned slice:', cleaned.slice(0, 500));
      return NextResponse.json({ error: 'Invalid JSON from model', detail: String(parseErr) }, { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('generate-report error:', error);
    return NextResponse.json({ error: 'Failed to generate report', detail: String(error) }, { status: 500 });
  }
}
