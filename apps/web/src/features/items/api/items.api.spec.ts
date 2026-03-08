import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listItems,
  createItem,
  updateItem,
  activateItem,
  deactivateItem,
} from './items.api';
import { httpClient } from '@/shared/api/http-client';

vi.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('items.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listItems', () => {
    it('파라미터 없이 호출 시 /items GET 요청', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: {
          total: 1,
          page: 1,
          pageSize: 500,
          items: [{ id: 'i1', itemCode: 'SKU-1', itemName: '상품' }],
        },
      } as never);

      const result = await listItems();
      expect(httpClient.get).toHaveBeenCalledWith('/items');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('검색어(q) 포함 시 쿼리 파라미터로 전달', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: { total: 0, page: 1, pageSize: 500, items: [] },
      } as never);
      await listItems({ q: '검색' });
      expect(httpClient.get).toHaveBeenCalledWith('/items?q=%EA%B2%80%EC%83%89');
    });

    it('includeInactive true 시 쿼리에 포함', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: { total: 0, page: 1, pageSize: 500, items: [] },
      } as never);
      await listItems({ includeInactive: true });
      expect(httpClient.get).toHaveBeenCalledWith('/items?includeInactive=true');
    });
  });

  describe('createItem', () => {
    it('payload로 POST /items 호출', async () => {
      const payload = { itemCode: 'SKU-001', itemName: '상품 A' };
      vi.mocked(httpClient.post).mockResolvedValue({
        data: { id: 'new', ...payload },
      } as never);

      const result = await createItem(payload);
      expect(httpClient.post).toHaveBeenCalledWith('/items', payload);
      expect(result.itemCode).toBe('SKU-001');
    });
  });

  describe('updateItem', () => {
    it('id와 payload로 PATCH 요청', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'i1', itemCode: 'SKU-002', itemName: '수정됨' },
      } as never);

      await updateItem('i1', { itemCode: 'SKU-002', itemName: '수정됨' });
      expect(httpClient.patch).toHaveBeenCalledWith('/items/i1', {
        itemCode: 'SKU-002',
        itemName: '수정됨',
      });
    });
  });

  describe('activateItem', () => {
    it('PATCH /items/:id/activate 호출', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'i1', isActive: true },
      } as never);

      await activateItem('i1');
      expect(httpClient.patch).toHaveBeenCalledWith('/items/i1/activate');
    });
  });

  describe('deactivateItem', () => {
    it('PATCH /items/:id/deactivate 호출', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'i1', isActive: false },
      } as never);

      await deactivateItem('i1');
      expect(httpClient.patch).toHaveBeenCalledWith('/items/i1/deactivate');
    });
  });
});
