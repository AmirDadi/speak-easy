'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Today', icon: '☀️' },
  { href: '/shadowing', label: 'Shadow', icon: '🎧' },
  { href: '/vocab', label: 'Vocab', icon: '✍️' },
  { href: '/speaking', label: 'Speak', icon: '🎙' },
  { href: '/social', label: 'Social', icon: '🎉' },
];

export function TabBar() {
  const path = usePathname();
  if (path.startsWith('/onboarding')) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                <span className={`text-xl ${active ? '' : 'opacity-70 grayscale'}`}>{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
