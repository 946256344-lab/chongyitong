import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, description, imageUrl } = await req.json();

  const pushKey = process.env.PUSHDEER_KEY;
  if (!pushKey) {
    return NextResponse.json({ ok: false, error: 'no push key' }, { status: 500 });
  }

  const title = encodeURIComponent('🔔 收到新需求！');
  const content = encodeURIComponent(
    `用户邮箱: ${email}\n需求描述: ${description}\n图片地址: ${imageUrl}`
  );

  try {
    const res = await fetch(
      `https://api2.pushdeer.com/message/push?pushkey=${pushKey}&text=${title}&desp=${content}`
    );
    if (!res.ok) throw new Error(`PushDeer responded ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PushDeer notify failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
