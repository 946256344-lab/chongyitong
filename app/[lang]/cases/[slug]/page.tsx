import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { getDictionary } from '../../../dictionaries';
import ReportView, { ReportData } from '../../../../components/ReportView';

export default async function CaseDetail({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const dict = await getDictionary(lang as 'en' | 'zh');

  const baseFilePath = path.join(process.cwd(), 'content/cases', `${slug}.md`);
  const localizedFilePath = path.join(process.cwd(), 'content/cases', lang, `${slug}.md`);
  const filePath = fs.existsSync(localizedFilePath) ? localizedFilePath : baseFilePath;

  if (!fs.existsSync(filePath)) return <div className="pt-40 text-center">{dict.cases.notFound}</div>;

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const htmlContent = marked(content);

  let reportData: ReportData | null = null;
  if (data.reportId) {
    const rPath = path.join(process.cwd(), 'content/reports', lang, `${data.reportId}.json`);
    if (fs.existsSync(rPath)) {
      reportData = JSON.parse(fs.readFileSync(rPath, 'utf8')) as ReportData;
    }
  }

  const isZh = lang === 'zh';
  const labels = {
    submittedBy:  isZh ? '用户提交的原始信息' : 'What the owner submitted',
    simulated:    isZh ? '模拟案例' : 'Simulated Case',
    medicalData:  isZh ? '医疗报告数据' : 'Medical report data',
    diagnosis:    isZh ? '诊断' : 'Diagnosis',
    treatment:    isZh ? '医生提出的选项' : 'Treatment options mentioned',
    priority:     isZh ? '最在意' : 'Priority',
    budget:       isZh ? '预算' : 'Budget',
    visitFreq:    isZh ? '复诊接受度' : 'Vet visit comfort',
    reportBelow:  isZh ? '↓ 以下是专家出具的报告' : '↓ Report prepared by our specialist',
  };

  const ui = data.userInput;

  return (
    <main className="min-h-screen bg-white text-gray-900 pt-44 pb-20 px-6">
      <article className="max-w-[750px] mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-blue-600 font-bold tracking-widest text-sm uppercase">
              {data.category}
            </span>
            {data.simulated && (
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-normal tracking-normal normal-case">
                {labels.simulated}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#2d334a] mb-8 leading-tight">
            {data.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-400 text-sm border-b pb-8">
            <span>{data.date}</span>
          </div>
        </header>

        {/* 用户提交的信息卡片 */}
        {ui && (
          <div className="mb-12 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-amber-800">📋 {labels.submittedBy}</span>
            </div>

            {/* 宠物基本信息 */}
            <p className="text-xs font-semibold text-amber-700 bg-amber-100 inline-block px-3 py-1 rounded-full mb-4">
              {ui.pet}
            </p>

            {/* 用户自述 */}
            <blockquote className="border-l-3 border-amber-300 pl-4 text-sm text-gray-600 leading-7 mb-5 whitespace-pre-line">
              {ui.description}
            </blockquote>

            {/* 医疗数据 */}
            <div className="bg-white rounded-xl px-4 py-3 text-xs text-gray-500 mb-4 leading-6">
              <span className="font-semibold text-gray-700">{labels.medicalData}：</span>
              {ui.medicalData}
            </div>

            {/* 结构化字段 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                [labels.diagnosis,  ui.diagnosis],
                [labels.treatment,  ui.treatmentOptions],
                [labels.priority,   ui.priority],
                [labels.budget,     ui.budget],
                [labels.visitFreq,  ui.visitFreq],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">{label}：</span>
                  <span className="text-gray-700">{value}</span>
                </div>
              ))}
            </div>

            {/* 分割线 */}
            <p className="mt-6 text-center text-xs text-amber-500 font-medium tracking-wide">
              {labels.reportBelow}
            </p>
          </div>
        )}

        {/* 报告正文 */}
        {reportData ? (
          <ReportView data={reportData} lang={lang} />
        ) : (
          <div
            className="prose prose-slate prose-lg max-w-none
            prose-headings:text-[#2d334a] prose-headings:font-bold
            prose-p:text-gray-600 prose-p:leading-8
            prose-strong:text-blue-600"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </article>
    </main>
  );
}
