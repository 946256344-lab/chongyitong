import { ReportData } from './ReportView';

interface Props {
  data: ReportData;
  lang: string;
}

export default function ReportCover({ data, lang }: Props) {
  const isZh = lang === 'zh';

  const labels = {
    brand:        'Pet Med-Pal',
    tagline:      isZh ? '宠物医疗决策助手' : 'Your Pet Medical Decision Companion',
    reportTitle:  isZh ? '健康评估报告' : 'Health Assessment Report',
    petLabel:     isZh ? '患者' : 'Patient',
    reportIdLabel:isZh ? '报告编号' : 'Report ID',
    dateLabel:    isZh ? '报告日期' : 'Report Date',
    submittedLabel:isZh ? '提交时间' : 'Submitted',
    completedLabel:isZh ? '完成时间' : 'Completed',
    notice:       isZh
      ? '本报告由宠医通专家根据主人提交材料出具，仅供参考，不构成医疗诊断。'
      : 'Prepared by a Pet Med-Pal specialist based on owner-submitted materials. For informational use only.',
    confidential: isZh ? '本报告为委托人专属文件，请妥善保管。' : 'This report is issued exclusively for the submitting owner.',
  };

  const petName = `${data.pet.breed} · ${data.pet.sex} · ${data.pet.age} · ${data.pet.weight}`;

  return (
    <div className="report-cover flex flex-col min-h-screen" style={{ backgroundColor: '#fff' }}>

      {/* Top bar — navy */}
      <div
        className="flex items-center justify-between px-10 py-6"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <div>
          <p className="text-white text-xl font-black tracking-wide">{labels.brand}</p>
          <p className="text-blue-200 text-xs mt-0.5">{labels.tagline}</p>
        </div>
        <p className="text-blue-200 text-xs font-mono">{data.report_id}</p>
      </div>

      {/* Hero section */}
      <div
        className="flex-1 flex flex-col justify-center px-10 py-16"
        style={{ background: 'linear-gradient(160deg, #F5F6F8 60%, #e8edf5 100%)' }}
      >
        {/* Report type label */}
        <p
          className="text-xs font-bold tracking-widest uppercase mb-4"
          style={{ color: '#1E3A5F' }}
        >
          {labels.reportTitle}
        </p>

        {/* Diagnosis headline */}
        <h1
          className="text-3xl font-black leading-snug mb-10 max-w-xl"
          style={{ color: '#1E3A5F' }}
        >
          {data.diagnosis_plain}
        </h1>

        {/* Divider */}
        <div className="w-16 h-1 mb-10 rounded" style={{ backgroundColor: '#1E3A5F' }} />

        {/* Meta table */}
        <div className="space-y-3 text-sm max-w-sm">
          {[
            [labels.petLabel,          petName],
            [labels.reportIdLabel,     data.report_id],
            [labels.dateLabel,         data.date],
            [labels.submittedLabel,    data.submitted],
            [labels.completedLabel,    data.completed],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="w-24 shrink-0 text-gray-400 text-xs pt-0.5">{label}</span>
              <span className="text-gray-700 font-medium text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — notice */}
      <div
        className="px-10 py-5 border-t text-xs text-gray-400 leading-6"
        style={{ borderColor: '#e2e8f0' }}
      >
        <p>{labels.notice}</p>
        <p className="mt-1">{labels.confidential}</p>
      </div>

    </div>
  );
}
