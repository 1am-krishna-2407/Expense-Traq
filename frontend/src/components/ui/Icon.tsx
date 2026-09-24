import clsx from 'clsx';

interface IconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

/** Material Symbols Outlined glyph — the icon set used throughout both designs. Decorative by default. */
export function Icon({ name, size = 20, filled, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx('material-symbols-outlined inline-flex shrink-0 items-center justify-center', filled && 'icon-filled', className)}
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  );
}
