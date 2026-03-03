type DataReliabilityBadgeProps = {
  asOf?: string;
  source: '집계';
  autoRefreshMs?: number;
};

export function DataReliabilityBadge({ asOf, source, autoRefreshMs }: DataReliabilityBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
        {source}
      </span>
      <span>기준 {asOf ? new Date(asOf).toLocaleTimeString() : '-'}</span>
      {autoRefreshMs ? <span>자동 {Math.round(autoRefreshMs / 1000)}초</span> : null}
    </div>
  );
}
