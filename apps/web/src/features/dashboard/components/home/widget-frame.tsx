export const WIDGET_LABELS: Record<string, string> = {
  alerts: '주의가 필요한 항목',
  todos: '내 할 일',
  inventory: '인벤토리 인사이트',
  analysis: '아이템 분석 요약',
};

type WidgetFrameProps = {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  /** 위젯 헤더에 표시할 추가 액션 버튼 등 */
  headerActions?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** 위젯 숨기기 (표시/숨김 설정용) */
  onHide?: () => void;
  children: React.ReactNode;
};

export function WidgetFrame({
  title,
  subtitle,
  meta,
  headerActions,
  collapsed,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onHide,
  children,
}: WidgetFrameProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          {meta ? <div className="mt-1">{meta}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="위로 이동"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
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
          {onHide ? (
            <button
              type="button"
              onClick={onHide}
              aria-label="위젯 숨기기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
              title="위젯 숨기기"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                className="h-3.5 w-3.5"
              >
                <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19 12 19c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 5c4.97 0 9 3.134 9 7 0 2.239-1.009 4.328-2.66 5.95M3 3l14 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          </div>
        </div>
      </div>
      {!collapsed ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
