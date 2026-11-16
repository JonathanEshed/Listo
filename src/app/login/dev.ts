'use server';
import { headers } from 'next/headers';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Localhost-only shortcut: sign in with a fixed code (DEV_LOGIN_CODE, e.g. 123456) and no email.
 *
 * Works only when ALL of these hold:
 *   - the app runs with `npm run dev`;
 *   - the page is opened on localhost / 127.0.0.1;
 *   - .env.local has DEV_LOGIN_CODE and SUPABASE_SECRET_KEY.
 * The secret key stays in .env.local on your own computer. Never set these two on Vercel.
 */
function config() {
  const code = process.env.DEV_LOGIN_CODE;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (process.env.NODE_ENV !== 'development' || !code || !secret) return null;
  const host = (headers().get('host') ?? '').split(':')[0];
  if (host !== 'localhost' && host !== '127.0.0.1') return null;
  return { code, secret };
}

export async function devLoginEnabled(): Promise<boolean> {
  return config() !== null;
}

export async function devSignIn(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const c = config();
  if (!c) return { ok: false };
  if (code.trim() !== c.code) return { ok: false, error: 'במצב פיתוח הקוד הוא ' + c.code + '.' };
  const address = email.trim().toLowerCase();

  // Ask Supabase (with the secret key, server-side only) for a fresh one-time code, then use it right away.
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, c.secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let link = await admin.auth.admin.generateLink({ type: 'magiclink', email: address });
  if (link.error) {
    // first time for this address: create the user, then try again
    await admin.auth.admin.createUser({ email: address, email_confirm: true });
    link = await admin.auth.admin.generateLink({ type: 'magiclink', email: address });
  }
  const otp = link.data?.properties?.email_otp;
  if (link.error || !otp) return { ok: false, error: 'כניסת הפיתוח נכשלה: ' + (link.error?.message ?? 'no code') };

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ email: address, token: otp, type: 'email' });
  if (error) return { ok: false, error: 'כניסת הפיתוח נכשלה: ' + error.message };
  return { ok: true };
}
