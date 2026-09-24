import clsx from 'clsx';
import { initials } from '../../lib/format';

/** RupeeFlow mark from ui/light/rupeeflow_brand_logo. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <rect width="48" height="48" rx="12" fill="#2563EB" />
      <path
        d="M14 15h14c3.314 0 6 2.686 6 6s-2.686 6-6 6H14m0-12v22m0-10h12l8 10M11 19h20M11 25h17"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx('flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-heading text-headline-sm font-bold tracking-tight text-ink">RupeeFlow</span>
    </span>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 font-semibold text-white ring-2 ring-primary/30"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
