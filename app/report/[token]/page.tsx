import { notFound } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ReportData } from '../../../components/ReportView';
import ReportCover from '../../../components/ReportCover';
import ReportView from '../../../components/ReportView';
import PrintButton from '../../../components/PrintButton';
import FullDisclaimer from '../../../components/FullDisclaimer';

/* ─── Page ────────────────────────────────────────────────── */

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
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
      {/* ── Cover (page 1 in print) ── */}
      <ReportCover data={reportData} lang={lang} />

      {/* ── Report body ── */}
      <main className="bg-white px-8 py-10">
        <div className="max-w-[750px] mx-auto">

          {/* Print button — hidden when printing */}
          <PrintButton lang={lang} />

          {/* All 8 report sections */}
          <ReportView data={reportData} lang={lang} />

          {/* Full legal disclaimer */}
          <FullDisclaimer lang={lang} />
        </div>
      </main>
    </>
  );
}
