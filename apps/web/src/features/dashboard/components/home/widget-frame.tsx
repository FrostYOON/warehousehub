type WidgetFrameProps = {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
};

export function WidgetFrame({
  title,
  subtitle,
  meta,
  collapsed,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children,
}: WidgetFrameProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          {meta ? <div className="mt-1">{meta}</div> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="위로 이동"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="위로 이동"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="h-3.5 w-3.5 stroke-current"
            >
              <path d="M5 12l5-5 5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="아래로 이동"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            title="아래로 이동"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="h-3.5 w-3.5 stroke-current"
            >
              <path d="M5 8l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? '펼치기' : '접기'}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
            title={collapsed ? '펼치기' : '접기'}
          >
            {collapsed ? (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="h-3.5 w-3.5 stroke-current"
              >
                <path d="M10 5v10M5 10h10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="h-3.5 w-3.5 stroke-current"
              >
                <path d="M5 10h10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {!collapsed ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
