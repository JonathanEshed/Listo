export function LogoMark({ className = 'h-8 w-8', light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M6 46L24 26L42 46" fill="none" stroke={light ? '#F2EEE4' : '#1D2A24'} strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M22 46L40 26L58 46" fill="none" stroke={light ? '#D9A266' : '#B0712F'} strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-2 font-head text-2xl font-bold ${light ? 'text-cream' : 'text-ink'}`}>
      <LogoMark light={light} />
      listo
    </span>
  );
}
