import React from 'react';

/* ─── Types ─────────────────────────────────────────────── */

export interface ReportData {
  report_id: string;
  date: string;
  submitted: string;
  completed: string;
  diagnosis_plain: string;
  pet: {
    breed: string;
    sex: string;
    age: string;
    weight: string;
    chief_complaint: string;
    clinic: string;
    report_type: string;
    vet: string;
    history: string;
  };
  summary: {
    severity: string;
    findings_count: string;
    decision_window: string;
    prognosis: string;
    paths: string;
    priority_match: string;
    next_step: string;
  };
  findings: Array<{
    name: string;
    value: string;
    range: string;
    deviation: string;
    meaning: string;
  }>;
  paths: Array<{
    label: string;
    approach: string;
    survival: string;
    cost: string;
    aligns: string;
    tensions: string;
  }>;
  prognosis_bullets: string[];
  prognosis_note: string;
  questions: string[];
  sources: string[];
}

/* ─── Deviation badge ────────────────────────────────────── */

function DeviationBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  let bg = '#e5e7eb';
  let color = '#374151';

  if (v.includes('severe') || v.includes('严重')) {
    bg = '#fee2e2'; color = '#991b1b';
  } else if (v.includes('moderate') || v.includes('中度')) {
    bg = '#ffedd5'; color = '#9a3412';
  } else if (v.includes('mild') || v.includes('轻度')) {
    bg = '#fef9c3'; color = '#713f12';
  } else if (v === 'normal' || v === '正常') {
    bg = '#dcfce7'; color = '#166534';
  }

  return (
    <span
      style={{ backgroundColor: bg, color, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      {value}
    </span>
  );
}

/* ─── Section heading ────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl font-bold border-b-2 pb-2 mb-4"
      style={{ color: '#1E3A5F', borderColor: '#1E3A5F' }}
    >
      {children}
    </h2>
  );
}

/* ─── 1. ReportHeader ────────────────────────────────────── */

function ReportHeader({ data }: { data: ReportData }) {
  return (
    <div className="mb-8 pb-6 border-b" style={{ borderColor: '#e2e8f0' }}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span
          className="text-xs font-mono font-bold px-3 py-1 rounded"
          style={{ backgroundColor: '#1E3A5F', color: '#fff' }}
        >
          {data.report_id}
        </span>
        <span className="text-xs text-gray-400">{data.date}</span>
      </div>
      <div className="text-xs text-gray-400 mb-3 space-x-4">
        <span>Submitted: {data.submitted}</span>
        <span>·</span>
        <span>Completed: {data.completed}</span>
      </div>
      <p className="text-lg font-semibold" style={{ color: '#1E3A5F' }}>
        {data.diagnosis_plain}
      </p>
    </div>
  );
}

/* ─── 2. SummaryCard ─────────────────────────────────────── */

const SUMMARY_LABELS_EN: Record<string, string> = {
  severity: 'Severity',
  findings_count: 'Findings Reviewed',
  decision_window: 'Decision Window',
  prognosis: 'Prognosis',
  paths: 'Treatment Paths',
  priority_match: 'Priority Match',
  next_step: 'Recommended Next Step',
};

const SUMMARY_LABELS_ZH: Record<string, string> = {
  severity: '严重程度',
  findings_count: '解读指标数',
  decision_window: '决策窗口',
  prognosis: '预后',
  paths: '治疗方案数',
  priority_match: '优先诉求匹配',
  next_step: '建议下一步',
};

function SummaryCard({ data, lang }: { data: ReportData; lang: string }) {
  const labels = lang === 'zh' ? SUMMARY_LABELS_ZH : SUMMARY_LABELS_EN;
  const title = lang === 'zh' ? '快速摘要' : 'Quick Summary';
  const entries = Object.entries(data.summary) as [keyof typeof data.summary, string][];

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {entries.map(([key, value], i) => (
              <tr key={key} className={i % 2 === 1 ? '' : ''}>
                <td
                  className="py-2.5 px-4 font-semibold text-white w-40 align-top"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  {labels[key] ?? key}
                </td>
                <td
                  className="py-2.5 px-4 text-gray-700 border"
                  style={{ borderColor: '#e2e8f0', backgroundColor: i % 2 === 0 ? '#F5F6F8' : '#fff' }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 3. PetProfile ──────────────────────────────────────── */

const PET_LABELS_EN: Record<string, string> = {
  breed: 'Breed',
  sex: 'Sex',
  age: 'Age',
  weight: 'Weight',
  chief_complaint: 'Chief Complaint',
  clinic: 'Clinic',
  report_type: 'Report Type',
  vet: 'Veterinarian',
  history: 'History',
};

const PET_LABELS_ZH: Record<string, string> = {
  breed: '品种',
  sex: '性别',
  age: '年龄',
  weight: '体重',
  chief_complaint: '主诉',
  clinic: '就诊医院',
  report_type: '检查类型',
  vet: '接诊医生',
  history: '病史',
};

function PetProfile({ data, lang }: { data: ReportData; lang: string }) {
  const labels = lang === 'zh' ? PET_LABELS_ZH : PET_LABELS_EN;
  const title = lang === 'zh' ? '宠物基本信息' : 'Pet Profile';
  const entries = Object.entries(data.pet) as [keyof typeof data.pet, string][];

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {entries.map(([key, value], i) => (
              <tr key={key}>
                <td
                  className="py-2.5 px-4 font-semibold text-white w-36 align-top"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  {labels[key] ?? key}
                </td>
                <td
                  className="py-2.5 px-4 text-gray-700 border"
                  style={{ borderColor: '#e2e8f0', backgroundColor: i % 2 === 0 ? '#F5F6F8' : '#fff' }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 4. MedicalFindings ─────────────────────────────────── */

function MedicalFindings({ data, lang }: { data: ReportData; lang: string }) {
  const title = lang === 'zh' ? '检测指标解读' : 'Medical Data Interpretation';
  const headers = lang === 'zh'
    ? ['参数', '检测值', '正常范围', '偏差', '临床意义']
    : ['Parameter', 'Measured Value', 'Normal Range', 'Deviation', 'Clinical Significance'];

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="py-2.5 px-3 text-left font-semibold text-white text-xs"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.findings.map((f, i) => (
              <tr key={f.name} style={{ backgroundColor: i % 2 === 0 ? '#F5F6F8' : '#fff' }}>
                <td className="py-2.5 px-3 font-medium text-gray-800 border-b" style={{ borderColor: '#e2e8f0' }}>{f.name}</td>
                <td className="py-2.5 px-3 font-mono text-gray-700 border-b" style={{ borderColor: '#e2e8f0' }}>{f.value}</td>
                <td className="py-2.5 px-3 text-gray-500 border-b" style={{ borderColor: '#e2e8f0' }}>{f.range}</td>
                <td className="py-2.5 px-3 border-b" style={{ borderColor: '#e2e8f0' }}>
                  <DeviationBadge value={f.deviation} />
                </td>
                <td className="py-2.5 px-3 text-gray-600 border-b" style={{ borderColor: '#e2e8f0' }}>{f.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 5. TreatmentPaths ──────────────────────────────────── */

function TreatmentPaths({ data, lang }: { data: ReportData; lang: string }) {
  const title = lang === 'zh' ? '治疗路径对比' : 'Treatment Path Comparison';
  const rowLabels = lang === 'zh'
    ? ['方案', '治疗方法', '生存/效果', '费用', '✓ 契合点', '△ 张力点']
    : ['Option', 'Approach', 'Survival / Efficacy', 'Cost', '✓ Aligns With Your Situation', '△ Tensions / Tradeoffs'];

  const keys: (keyof ReportData['paths'][0])[] = ['label', 'approach', 'survival', 'cost', 'aligns', 'tensions'];

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="py-2.5 px-3 text-left font-semibold text-white text-xs w-36"
                style={{ backgroundColor: '#1E3A5F' }}
              >
                {lang === 'zh' ? '维度' : 'Dimension'}
              </th>
              {data.paths.map((p) => (
                <th
                  key={p.label}
                  className="py-2.5 px-3 text-left font-semibold text-white text-xs"
                  style={{ backgroundColor: '#1E3A5F' }}
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, i) => (
              <tr key={key} style={{ backgroundColor: i % 2 === 0 ? '#F5F6F8' : '#fff' }}>
                <td
                  className="py-2.5 px-3 font-semibold text-xs border-b align-top"
                  style={{ borderColor: '#e2e8f0', color: '#1E3A5F' }}
                >
                  {rowLabels[i]}
                </td>
                {data.paths.map((p) => (
                  <td
                    key={p.label}
                    className="py-2.5 px-3 text-gray-600 border-b align-top"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    {p[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 6. Prognosis ───────────────────────────────────────── */

function Prognosis({ data, lang }: { data: ReportData; lang: string }) {
  const title = lang === 'zh' ? '预后参考' : 'Prognosis Reference';

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <ul className="space-y-2 mb-4">
        {data.prognosis_bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-600 leading-6">
            <span style={{ color: '#1E3A5F', fontWeight: 700, flexShrink: 0 }}>•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <blockquote
        className="border-l-4 pl-4 py-2 text-sm text-gray-600 italic rounded-r"
        style={{ borderColor: '#1E3A5F', backgroundColor: '#F5F6F8' }}
      >
        {data.prognosis_note}
      </blockquote>
    </div>
  );
}

/* ─── 7. VetQuestions ────────────────────────────────────── */

function VetQuestions({ data, lang }: { data: ReportData; lang: string }) {
  const title = lang === 'zh' ? '与兽医沟通的问题清单' : 'Questions to Ask Your Vet';

  return (
    <div className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <ol className="space-y-3">
        {data.questions.map((q, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-600 leading-6">
            <span
              className="font-bold text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              {i + 1}
            </span>
            <span>{q}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─── 8. Disclaimer ──────────────────────────────────────── */

function Disclaimer({ data, lang }: { data: ReportData; lang: string }) {
  const text = lang === 'zh'
    ? `本报告依据主人提交的资料生成，仅供参考，不构成医疗诊断或治疗建议。一切诊疗决定请遵从兽医的专业指导。`
    : `This report was generated based on materials submitted by the owner and is for informational purposes only. It does not constitute a medical diagnosis or treatment recommendation. Please follow your veterinarian's guidance for all treatment decisions.`;

  return (
    <div
      className="mt-10 pt-6 border-t text-xs text-gray-400 leading-6"
      style={{ borderColor: '#e2e8f0' }}
    >
      <p>{text}</p>
      <p className="mt-2">© VetDecide AI ｜ Report ID {data.report_id}</p>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────── */

export default function ReportView({ data, lang, mode = 'full' }: { data: ReportData; lang: string; mode?: 'quick' | 'full' }) {
  return (
    <div className="font-sans">
      <ReportHeader data={data} />
      <SummaryCard data={data} lang={lang} />
      <PetProfile data={data} lang={lang} />
      <MedicalFindings data={data} lang={lang} />
      {mode === 'full' && (
        <>
          <TreatmentPaths data={data} lang={lang} />
          <Prognosis data={data} lang={lang} />
          <VetQuestions data={data} lang={lang} />
          <Disclaimer data={data} lang={lang} />
        </>
      )}
    </div>
  );
}
