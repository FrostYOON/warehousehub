export const asnKeys = {
  all: ['asn'] as const,
  list: (params?: Record<string, unknown>) =>
    [...asnKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...asnKeys.all, 'detail', id] as const,
};
