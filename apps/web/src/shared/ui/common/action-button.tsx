'use client';

type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: ActionButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
};

const variantStyles: Record<ActionButtonVariant, string> = {
  primary:
    'border-transparent bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400',
  secondary:
    'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus:ring-slate-300',
  ghost:
    'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
  danger:
    'border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 focus:ring-red-300',
};

const sizeStyles = {
  sm: 'h-8 rounded-md px-2 text-xs',
  md: 'h-9 rounded-lg px-3 text-sm',
  lg: 'h-10 rounded-lg px-4 text-sm',
};

export function ActionButton({
  onClick,
  disabled,
  disabledReason,
  variant = 'secondary',
  size = 'md',
  className,
  children,
}: ActionButtonProps) {
  const baseClass =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

  const defaultClass =
    className ??
    [
      baseClass,
      'border',
      variantStyles[variant],
      sizeStyles[size],
    ].join(' ');

  const customClass = className
    ? `${baseClass} ${className}`
    : defaultClass;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={customClass}
    >
      {children}
    </button>
  );
}
