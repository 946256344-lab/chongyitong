// This route handles /[lang]/report/[token] — created because the language
// middleware redirects /report/:token → /zh/report/:token (or /en/...).
// We read the token from params and ignore the URL lang;
// the display language comes from the report data stored in Supabase.

import { notFound } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { ReportData } from '../../../../components/ReportView';
import ReportCover from '../../../../components/ReportCover';
import ReportView from '../../../../components/ReportView';
import PrintButton from '../../../../components/PrintButton';
import FullDisclaimer from '../../../../components/FullDisclaimer';

export default async function ReportPageLang({
  params,
}: {
  params: Promise<{ lang: string; token: string }>;
}) {
  const { token } = await params;

  const { data: row, error } = await supabase
    .from('reports')
    .select('lang, data')
    .eq('token', token)
    .single();

  if (error || !row) notFound();

  const lang       = row.lang as string;
  const reportData = row.data as ReportData;

  return (
    <>
      <ReportCover data={reportData} lang={lang} />
      <main className="bg-white px-8 py-10">
        <div className="max-w-[750px] mx-auto">
          <PrintButton lang={lang} />
          <ReportView data={reportData} lang={lang} />
          <FullDisclaimer lang={lang} />
        </div>
      </main>
    </>
  );
}
