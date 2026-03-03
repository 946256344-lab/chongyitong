'use client';

export default function PrintButton({ lang }: { lang: string }) {
  const label = lang === 'zh' ? '打印 / 存为 PDF' : 'Print / Save as PDF';
  const hint  = lang === 'zh'
    ? '在浏览器打印对话框中选择「另存为 PDF」即可下载'
    : 'In the browser print dialog, choose "Save as PDF" to download';

  return (
    <div className="no-print flex flex-col items-end gap-1 mb-8">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        {label}
      </button>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  );
}
