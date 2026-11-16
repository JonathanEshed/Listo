import { NextResponse } from 'next/server';

/** Local preview only: issues a fake session for the mock API (scripts/mock-supabase.mjs). Disabled unless the URL points at the mock. */
export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!base.startsWith('http://localhost:54321')) return new NextResponse('Not found', { status: 404 });
  const session = {
    access_token: 'mock', refresh_token: 'mock', token_type: 'bearer', expires_in: 3600 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    user: { id: '00000000-0000-0000-0000-00000000000a', aud: 'authenticated', role: 'authenticated', email: 'noa@example.com', app_metadata: {}, user_metadata: {} },
  };
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set('sb-localhost-auth-token', 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), { path: '/' });
  return res;
}
