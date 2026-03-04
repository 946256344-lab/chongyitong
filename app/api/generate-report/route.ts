import { NextRequest, NextResponse } from 'next/server';

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

function buildPrompt(
  description: string,
  intake: Record<string, string> | null,
  lang: string,
): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const reportId = `PM-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const isZh = lang === 'zh';

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

Owner's description:
"${description}"
${intakeBlock}
Report language: ${isZh ? 'Chinese (Simplified)' : 'English'}
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

Generate 3–6 findings based on the described exam/report. Generate 2–3 treatment paths. All text must be in ${isZh ? 'Chinese' : 'English'}.`;
}

export async function POST(req: NextRequest) {
  try {
    const { description, intake, lang } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const prompt = buildPrompt(description, intake ?? null, lang ?? 'en');

    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [
          {
            role: 'system',
            content: 'You are a veterinary medical report generator. You must respond with valid JSON only, no markdown, no explanation, no code fences.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Kimi API error:', errText);
      return NextResponse.json({ error: 'Kimi API error', detail: errText }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    console.log('Kimi raw response (first 300 chars):', raw.slice(0, 300));

    // Extract the JSON object by locating the outermost { ... }
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      console.error('No JSON object in response. Raw:', raw.slice(0, 500));
      return NextResponse.json({ error: 'Model returned no JSON', detail: raw.slice(0, 200) }, { status: 500 });
    }

    // Fix common LLM JSON mistakes before parsing
    const cleaned = raw.slice(start, end + 1)
      .replace(/,(\s*[}\]])/g, '$1');  // remove trailing commas in objects/arrays

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
