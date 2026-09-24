import clsx from 'clsx';

interface ProgressBarProps {
  /** True percentage; may exceed 100. The bar is clamped, the label is not (Plan §16). */
  percent: number;
  className?: string;
  barClassName?: string;
  color?: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ percent, className, barClassName, color, label, size = 'md' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${percent.toFixed(1)}%`}
      className={clsx('w-full overflow-hidden rounded-full bg-track', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', barClassName)}
        style={{ width: `${clamped}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
