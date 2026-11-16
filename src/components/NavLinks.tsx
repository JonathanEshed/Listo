'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'בית', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { href: '/pool', label: 'מאגר', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { href: '/requests', label: 'מבוקשים', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
  { href: '/coops', label: 'שת״פ', icon: 'M4 12l4 4 8-8M14 16l2 2 6-6' },
  { href: '/profile', label: 'פרופיל', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z' },
];

export function NavLinks({ variant, unread, isAdmin }: { variant: 'top' | 'bottom'; unread: number; isAdmin: boolean }) {
  const path = usePathname();
  const items = isAdmin && variant === 'top' ? [...ITEMS, { href: '/admin', label: 'ניהול', icon: '' }] : ITEMS;
  return (
    <>
      {items.map((it) => {
        const on = it.href === '/' ? path === '/' : path.startsWith(it.href);
        const badge = it.href === '/' && unread > 0;
        if (variant === 'top')
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? 'page' : undefined}
              className={`relative rounded-full px-3.5 py-2 text-[15px] font-semibold transition ${on ? 'bg-mint text-green' : 'text-muted hover:text-ink'}`}
            >
              {it.label}
              {badge && <span className="absolute -top-0.5 left-1 grid h-4 min-w-4 place-items-center rounded-full bg-ochre px-1 text-[10px] text-white num">{unread}</span>}
            </Link>
          );
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${on ? 'text-green' : 'text-muted'}`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.7} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
              <path d={it.icon} />
            </svg>
            {it.label}
            {badge && <span className="absolute right-[calc(50%-18px)] top-1.5 h-2.5 w-2.5 rounded-full bg-ochre" />}
          </Link>
        );
      })}
    </>
  );
}
