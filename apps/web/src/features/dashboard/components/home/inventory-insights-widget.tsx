import Link from 'next/link';

export type InventoryInsights = {
  expirySoonCount: number;
  expiryByDays?: {
    within7: number;
    within14: number;
    within30: number;
    within60: number;
    within90: number;
  };
  shortageCount: number;
};

const EXPIRY_BUCKETS = [
  { key: 'within7' as const, label: '7일 이내', days: 7 },
  { key: 'within14' as const, label: '14일 이내', days: 14 },
  { key: 'within30' as const, label: '30일 이내', days: 30 },
  { key: 'within60' as const, label: '60일 이내', days: 60 },
  { key: 'within90' as const, label: '90일 이내', days: 90 },
] as const;

type InventoryInsightsWidgetProps = {
  insights: InventoryInsights;
};

export function InventoryInsightsWidget({ insights }: InventoryInsightsWidgetProps) {
  const { expirySoonCount, expiryByDays, shortageCount } = insights;
  const hasExpiry = expiryByDays
    ? Object.values(expiryByDays).some((v) => v > 0)
    : expirySoonCount > 0;
  const hasAny = hasExpiry || shortageCount > 0;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">인벤토리 인사이트</p>
      <div className="flex flex-wrap gap-3">
        {expiryByDays ? (
          EXPIRY_BUCKETS.map(
            (bucket) =>
              expiryByDays[bucket.key] > 0 && (
                <Link
                  key={bucket.key}
                  href={`/stocks?expirySoon=${bucket.days}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition-colors hover:border-amber-300 hover:bg-amber-100"
                >
                  <span className="font-bold tabular-nums text-amber-700">
                    {expiryByDays[bucket.key]}
                  </span>
                  <span className="text-amber-800">유통기한 임박 ({bucket.label})</span>
                </Link>
              ),
          )
        ) : (
          <Link
            href="/stocks?expirySoon=30"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition-colors hover:border-amber-300 hover:bg-amber-100"
          >
            <span className="font-bold tabular-nums text-amber-700">{expirySoonCount}</span>
            <span className="text-amber-800">유통기한 임박 (30일 이내)</span>
          </Link>
        )}
        <Link
          href="/stocks?shortageOnly=1"
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm transition-colors hover:border-red-300 hover:bg-red-100"
        >
          <span className="font-bold tabular-nums text-red-700">{shortageCount}</span>
          <span className="text-red-800">재고 부족 (가용수량 &lt; 0)</span>
        </Link>
      </div>
      {!hasAny && (
        <p className="text-xs text-slate-500">현재 주의가 필요한 인벤토리 이슈가 없습니다.</p>
      )}
    </div>
  );
}
