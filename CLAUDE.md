# Listo · notes for Claude

Listo is a co-brokerage (תיווך שיתופי) community for licensed Israeli real-estate agents: shared listings pool,
buyer requests board, matching + alerts, one standard co-op agreement with arbitration, verified deals.

## Always
- Talk to the user in Hebrew. UI copy is Hebrew, RTL.
- Listo does NOT take brokerage commissions and never sets the split: the listing agent proposes, the buyer's agent accepts or counters.
- Listo is for ALL licensed agents (independent, office, chain), not only independents.
- Don't state a launch city. No "win exclusivity" messaging.
- Prices end in .90. No free tier.

## Design
- Emil Kowalski / Apple-like: calm, precise, generous whitespace, short ease-out motion (cubic-bezier(.23,1,.32,1), 200–320ms), press scale .97, respect prefers-reduced-motion.
- White background. Brand "bottle green" #22392F, ink #1D2A24, ochre #9E6327 / light #D9A266, mint #EEF3EC, line #E5E0D4.
- Fonts: Rubik (headings), Heebo (body). Logo: two interlocking roofs + "listo" wordmark (src/components/Logo.tsx).
- Shared classes live in src/app/globals.css (btn-primary, input-lg, tile, ob-title, ob-lead…).

## Stack
Next.js 14 App Router + Server Actions, TypeScript, Tailwind, Supabase (Postgres + RLS, email OTP, storage).
Schema: supabase/migrations. DB tests: `npm run test:db` (PGlite). Preview without Supabase: see README (mock server, MOCK_ME=new|pending).
Local dev sign-in with a fixed code: DEV_LOGIN_CODE + SUPABASE_SECRET_KEY in .env.local (localhost + npm run dev only).
