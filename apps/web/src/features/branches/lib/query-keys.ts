export const branchesKeys = {
  all: ['branches'] as const,
  list: () => [...branchesKeys.all, 'list'] as const,
  detail: (id: string) => [...branchesKeys.all, 'detail', id] as const,
};
