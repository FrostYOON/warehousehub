'use client';

type SortDir = 'asc' | 'desc';

type SortableHeaderProps = {
  label: string;
  sortKey: string;
  currentSortKey: string;
  currentSortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
};

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M7 4v8M13 4v8M7 4l3-3 3 3M13 16l-3 3-3-3" />
    </svg>
  );
}

/**
 * 정렬 가능한 테이블 헤더.
 * chevron 아이콘으로 정렬 상태 표시
 */
export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 font-semibold text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 rounded"
      >
        {label}
        <span className="inline-flex text-slate-400">
          {!isActive ? (
            <ChevronUpDownIcon className="h-3.5 w-3.5" />
          ) : currentSortDir === 'asc' ? (
            <ChevronUpIcon className="h-3.5 w-3.5 text-slate-600" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-600" />
          )}
        </span>
      </button>
    </th>
  );
}
