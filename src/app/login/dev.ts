'use server';
import { createClient } from '@/lib/supabase/server';

/**
 * Development-only shortcut: type a fixed code (e.g. 123456) instead of waiting for an email.
 *
 * How it works: after one real email-code sign-in on this machine, the account gets a long random
 * password that lives only in .env.local (DEV_LOGIN_PASSWORD). From then on the fixed code
 * (DEV_LOGIN_CODE) signs in with that password. The short code itself is never a password.
 *
 * Off unless `npm run dev` is running AND both variables are set. Never set them on Vercel.
 */
function config() {
  const code = process.env.DEV_LOGIN_CODE;
  const password = process.env.DEV_LOGIN_PASSWORD;
  const on = process.env.NODE_ENV === 'development' && !!code && !!password && password.length >= 16;
  return on ? { code: code!, password: password! } : null;
}

export async function devLoginEnabled(): Promise<boolean> {
  return config() !== null;
}

/** Signs in with the fixed dev code. Returns false when the code doesn't apply, so the caller tries the real OTP. */
export async function devSignIn(email: string, code: string): Promise<{ ok: boolean; needsRealCodeOnce?: boolean }> {
  const c = config();
  if (!c || code.trim() !== c.code) return { ok: false };
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: c.password });
  if (error) return { ok: false, needsRealCodeOnce: true };
  return { ok: true };
}

/** After a real email-code sign-in in development, link the dev password so the fixed code works next time. */
export async function devLinkPassword(): Promise<void> {
  const c = config();
  if (!c) return;
  const supabase = createClient();
  await supabase.auth.updateUser({ password: c.password });
}
