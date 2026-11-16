import Link from 'next/link';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import type { Profile } from '@/lib/types';

/** Header with navigation (desktop) and a bottom tab bar (phone). */
export function AppShell({ profile, unread, children }: { profile: Profile; unread: number; children: React.ReactNode }) {
  return (
    <div className="pb-24 sm:pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="Listo, דף הבית"><Logo /></Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="ניווט ראשי">
            <NavLinks variant="top" unread={unread} isAdmin={profile.is_admin} />
          </nav>
          <Link href="/profile" className="hidden items-center gap-2 text-sm font-semibold text-muted sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-green text-cream">{(profile.full_name || '?')[0]}</span>
          </Link>
        </div>
      </header>
      <main className="wrap py-6 sm:py-8">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="ניווט ראשי"
      >
        <div className="grid grid-cols-5">
          <NavLinks variant="bottom" unread={unread} isAdmin={profile.is_admin} />
        </div>
      </nav>
    </div>
  );
}
