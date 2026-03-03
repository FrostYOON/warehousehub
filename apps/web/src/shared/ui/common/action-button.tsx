'use client';

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  children: React.ReactNode;
};

export function ActionButton({
  onClick,
  disabled,
  disabledReason,
  className,
  children,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={
        className ??
        'h-9 rounded-lg border border-slate-300 px-3 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'
      }
    >
      {children}
    </button>
  );
}
