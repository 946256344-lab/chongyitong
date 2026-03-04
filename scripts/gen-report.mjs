/**
 * 宠医通报告生成器
 *
 * 用法：
 *   node --env-file=.env.local scripts/gen-report.mjs zh case-brief.txt
 *   node --env-file=.env.local scripts/gen-report.mjs en case-brief.txt
 *
 * case-brief.txt 里用自然语言描述病例，例如：
 *
 *   宠物：英国短毛猫，雄性已绝育，6岁，5.8kg
 *   主诉：年度体检发现心脏杂音 II 级
 *   医疗数据：IVSd 6.8mm，LVPWd 6.2mm，LA/Ao 1.52，EF 68%，SAM 阴性
 *   诊断：非梗阻性肥厚性心肌病（HCM），ACVIM B1期
 *   治疗选项：阿替洛尔 或 观察等待
 *   主人诉求：减少应激，不频繁就医
 *   预算：$2000-$5000
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ── Args ────────────────────────────────────────────────────
const [lang, briefFile] = process.argv.slice(2);

if (!lang || !['zh', 'en'].includes(lang)) {
  console.error('用法: node scripts/gen-report.mjs <zh|en> [brief.txt]');
  process.exit(1);
}

// ── Read brief ───────────────────────────────────────────────
let brief = '';
if (briefFile) {
  try {
    brief = readFileSync(briefFile, 'utf8').trim();
  } catch {
    console.error(`无法读取文件: ${briefFile}`);
    process.exit(1);
  }
} else {
  // Interactive input
  const isZh = lang === 'zh';
  const prompt = isZh
    ? '请粘贴病例信息（输入完毕后按 Ctrl+D 结束）：\n'
    : 'Paste the case brief (press Ctrl+D when done):\n';
  process.stdout.write(prompt);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  brief = Buffer.concat(chunks).toString('utf8').trim();
}

if (!brief) {
  console.error('病例信息为空，已退出。');
  process.exit(1);
}

// ── Generate report_id ───────────────────────────────────────
const year  = new Date().getFullYear();
const seq   = String(Math.floor(Math.random() * 9000) + 1000);
const reportId = `PM-${year}-${seq}`;
const today = new Date().toISOString().slice(0, 10);

// ── Claude prompt ────────────────────────────────────────────
const isZh = lang === 'zh';

const systemPrompt = `You are a professional veterinary report specialist for Pet Med-Pal.
Given a case brief, generate a complete structured report as valid JSON.

IMPORTANT:
- Output ONLY raw JSON, no markdown fences, no explanation
- Language: ${isZh ? '全部用中文（包括字段值）' : 'All content in English'}
- report_id is already set: "${reportId}"
- date is already set: "${today}"
- submitted/completed: use "${today}" with plausible times

JSON schema to fill:
{
  "report_id": string,
  "date": string,
  "submitted": string,
  "completed": string,
  "diagnosis_plain": string,           // one sentence
  "pet": {
    "breed": string,
    "sex": string,
    "age": string,
    "weight": string,
    "chief_complaint": string,
    "clinic": string,                  // infer or use "Specialty veterinary hospital"
    "report_type": string,             // type of tests submitted
    "vet": string,                     // infer or use generic
    "history": string
  },
  "summary": {
    "severity": string,                // e.g. "Moderate concern — ..."
    "findings_count": string,          // e.g. "6 parameters reviewed"
    "decision_window": string,
    "prognosis": string,
    "paths": string,                   // e.g. "2 paths: A vs B"
    "priority_match": string,          // which option best matches owner priority
    "next_step": string
  },
  "findings": [                        // list each test parameter
    { "name": string, "value": string, "range": string,
      "deviation": string,             // e.g. "↑ Moderate" / "Normal" / "↓ Mild"
      "meaning": string }
  ],
  "paths": [                           // one object per treatment option
    { "label": string,                 // "Option A" / "方案A"
      "approach": string,
      "survival": string,
      "cost": string,
      "aligns": string,                // how it fits owner situation
      "tensions": string }             // downsides / tradeoffs
  ],
  "prognosis_bullets": [string],       // 3-5 bullet points
  "prognosis_note": string,            // 1-2 sentence personalised note
  "questions": [string],               // 5-7 questions for the vet
  "sources": [string]                  // 2-3 real references
}`;

const userMessage = `Case brief:\n\n${brief}`;

// ── Call Claude ──────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log('\n⏳ 正在生成报告，请稍候…\n');

const stream = anthropic.messages.stream({
  model: 'claude-opus-4-6',
  max_tokens: 4096,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});

let jsonText = '';
process.stdout.write('Claude: ');
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write('.');
    jsonText += event.delta.text;
  }
}
process.stdout.write('\n\n');

// ── Parse JSON ───────────────────────────────────────────────
let reportData;
try {
  // Strip possible markdown fences just in case
  const cleaned = jsonText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  reportData = JSON.parse(cleaned);
} catch (e) {
  console.error('⚠️  Claude 返回的不是合法 JSON，原始内容：\n');
  console.error(jsonText.slice(0, 500));
  process.exit(1);
}

// ── Insert to Supabase ───────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const { data: row, error } = await supabase
  .from('reports')
  .insert({ lang, data: reportData })
  .select('token')
  .single();

if (error) {
  console.error('插入 Supabase 失败：', error.message);
  process.exit(1);
}

const token = row.token;

// ── Done ─────────────────────────────────────────────────────
console.log('✓ 报告生成成功！\n');
console.log(`  报告编号 : ${reportId}`);
console.log(`  语言     : ${lang}`);
console.log(`  Token    : ${token}`);
console.log(`\n  发给用户的链接：`);
console.log(`  https://severepetcondition.site/report/${token}\n`);
