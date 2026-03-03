import Link from 'next/link';
import type { DashboardAlert } from '@/features/dashboard/model/types';

function alertTone(alert: DashboardAlert) {
  if (alert.level === 'critical') {
    return {
      box: 'border-red-200 bg-red-50',
      title: 'text-red-800',
      chip: 'border-red-300 bg-white text-red-800 hover:bg-red-100',
      badge: 'CRITICAL',
    };
  }
  if (alert.level === 'warning') {
    return {
      box: 'border-amber-200 bg-amber-50',
      title: 'text-amber-800',
      chip: 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100',
      badge: 'WARNING',
    };
  }
  return {
    box: 'border-sky-200 bg-sky-50',
    title: 'text-sky-800',
    chip: 'border-sky-300 bg-white text-sky-800 hover:bg-sky-100',
    badge: 'INFO',
  };
}

type AlertsWidgetProps = {
  alerts: DashboardAlert[];
};

export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <div key={alert.id} className={`rounded-lg border px-3 py-2 ${alertTone(alert).box}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-medium ${alertTone(alert).title}`}>
              <span className="mr-2 rounded bg-white px-1.5 py-0.5 text-[10px]">
                {alertTone(alert).badge}
              </span>
              {alert.label}
            </p>
            <Link href={alert.href} className={`rounded-md border px-2 py-1 text-xs ${alertTone(alert).chip}`}>
              {alert.value}건 확인
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
