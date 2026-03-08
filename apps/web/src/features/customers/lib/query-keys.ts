export const customersKeys = {
  all: ['customers'] as const,
  list: (params?: { q?: string; filterIsActive?: string }) =>
    ['customers', 'list', params ?? {}] as const,
};
