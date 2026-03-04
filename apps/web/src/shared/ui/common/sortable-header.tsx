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

/**
 * 정렬 가능한 테이블 헤더.
 * ↑ 오름차순, ↓ 내림차순, ↕ 미선택
 */
export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const mark = currentSortKey !== sortKey ? '↕' : currentSortDir === 'asc' ? '↑' : '↓';

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-700"
      >
        {label}
        <span className="text-[10px] text-slate-400">{mark}</span>
      </button>
    </th>
  );
}
