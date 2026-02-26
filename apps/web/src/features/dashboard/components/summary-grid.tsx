import type { DashboardSummary } from '@/features/dashboard/model/types';

type SummaryGridProps = {
  items: DashboardSummary[];
};

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm text-slate-500">{item.title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
          <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}
