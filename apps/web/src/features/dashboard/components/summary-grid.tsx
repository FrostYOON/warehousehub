'use client';

import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { DashboardSummary } from '@/features/dashboard/model/types';

type SummaryGridProps = {
  items: DashboardSummary[];
};

function SummaryItem({
  item,
  isLink,
}: {
  item: DashboardSummary;
  isLink: boolean;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{item.title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {item.value}
      </p>
    </>
  );

  const wrapperClass = isLink
    ? 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1'
    : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {isLink ? (
          <Link href={item.href!} className={wrapperClass}>
            {content}
          </Link>
        ) : (
          <article className={wrapperClass}>{content}</article>
        )}
      </Tooltip.Trigger>
      {item.hint && (
        <Tooltip.Portal>
          <Tooltip.Content
            className="max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg"
            sideOffset={4}
            side="bottom"
          >
            {item.hint}
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  );
}

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
      {items.map((item) => (
        <SummaryItem key={item.title} item={item} isLink={Boolean(item.href)} />
      ))}
    </section>
  );
}
