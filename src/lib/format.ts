import type { SplitKind } from './types';

export const ils = (n: number | null | undefined) =>
  n == null ? '' : '₪' + Math.round(n).toLocaleString('en-US');

export const millions = (n: number) =>
  '₪' + (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' מיליון';

export function splitLabel(kind: SplitKind | null | undefined, pct: number | null | undefined) {
  if (kind === 'each') return 'כל אחד גובה מהלקוח שלו';
  if (kind === 'pct' && pct != null) return `${pct}/${100 - pct}`;
  return 'לא הוגדר';
}

export const dateTime = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

export const date = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export const COOP_STATUS: Record<string, string> = {
  pending: 'ממתין לחתימת המתווך המפרסם',
  countered: 'הצעה נגדית, ממתין לתשובה',
  signed: 'חתום',
  declined: 'נדחה',
  cancelled: 'בוטל',
  expired: 'פג תוקף',
};

export const OFFICE_KIND: Record<string, string> = { independent: 'עצמאי/ת', office: 'משרד', chain: 'רשת תיווך' };

/** Maps database exception codes to Hebrew messages. */
export function dbError(message: string): string {
  const map: Record<string, string> = {
    not_verified: 'החשבון עדיין לא אומת. נעדכן ברגע שהרישיון יאושר.',
    buyer_order_required: 'צריך הזמנת שירותי תיווך חתומה מהקונה לפני שמבקשים שיתוף פעולה.',
    listing_not_available: 'הנכס כבר לא זמין במאגר.',
    own_listing: 'זה הנכס שלך.',
    counter_pct_invalid: 'הצעה נגדית צריכה להיות אחוז בין 1 ל־99.',
    not_open: 'הבקשה כבר טופלה.',
    not_signed: 'אפשר לדווח על עסקה רק בשיתוף פעולה חתום.',
    not_allowed: 'הפעולה הזו שמורה לצד השני.',
    already_resolved: 'העסקה כבר טופלה.',
    not_admin: 'הפעולה שמורה למנהלים.',
  };
  const key = Object.keys(map).find((k) => message.includes(k));
  if (key) return map[key];
  if (message.includes('duplicate key') && message.includes('deals')) return 'כבר דווחה עסקה על שיתוף הפעולה הזה.';
  if (message.includes('row-level security')) return 'אין הרשאה לפעולה הזו.';
  return 'משהו השתבש. נסו שוב בעוד רגע.';
}
