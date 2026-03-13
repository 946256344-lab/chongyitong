import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { lang, data } = await req.json();
    if (!lang || !data) {
      return NextResponse.json({ error: 'Missing lang or data' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from('reports')
      .insert([{ token, lang, data }]);

    if (error) throw error;

    return NextResponse.json({ token });
  } catch (err) {
    console.error('save-report error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
