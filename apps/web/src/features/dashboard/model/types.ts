export type DashboardSummary = {
  title: string;
  value: string;
  hint: string;
};

export type DashboardMenu = {
  label: string;
  description: string;
  href: string;
  disabled?: boolean;
  disabledReason?: string;
};
