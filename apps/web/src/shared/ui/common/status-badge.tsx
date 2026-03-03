'use client';

type StatusBadgeProps = {
  status: string;
};

function toneOf(status: string): string {
  const value = status.toUpperCase();
  if (
    value.includes('COMPLETED') ||
    value.includes('CONFIRMED') ||
    value.includes('DELIVERED') ||
    value.includes('VALID')
  ) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (
    value.includes('CANCELLED') ||
    value.includes('INVALID') ||
    value.includes('ERROR')
  ) {
    return 'bg-red-100 text-red-700';
  }
  if (
    value.includes('PICKING') ||
    value.includes('PICKED') ||
    value.includes('READY') ||
    value.includes('SHIPPING') ||
    value.includes('DECIDED')
  ) {
    return 'bg-blue-100 text-blue-700';
  }
  return 'bg-slate-100 text-slate-700';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneOf(status)}`}
    >
      {status}
    </span>
  );
}
