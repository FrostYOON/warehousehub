import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
} from './customers.api';
import { httpClient } from '@/shared/api/http-client';

vi.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('customers.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCustomers', () => {
    it('파라미터 없이 호출 시 /customers GET 요청', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: {
          total: 1,
          page: 1,
          pageSize: 500,
          items: [{ id: 'c1', customerName: '고객사A' }],
        },
      } as never);

      const result = await listCustomers();
      expect(httpClient.get).toHaveBeenCalledWith('/customers');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('검색어(q) 포함 시 쿼리 파라미터로 전달', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: { total: 0, page: 1, pageSize: 500, items: [] },
      } as never);
      await listCustomers({ q: '검색어' });
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('q='),
      );
    });
  });

  describe('createCustomer', () => {
    it('payload로 POST /customers 호출', async () => {
      const payload = {
        customerName: '고객사A',
        customerAddress: '서울시 강남구',
      };
      vi.mocked(httpClient.post).mockResolvedValue({
        data: { id: 'new', ...payload },
      } as never);

      const result = await createCustomer(payload);
      expect(httpClient.post).toHaveBeenCalledWith('/customers', payload);
      expect(result.customerName).toBe('고객사A');
    });
  });

  describe('updateCustomer', () => {
    it('id와 payload로 PATCH 요청', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'c1', customerName: '수정된 고객사' },
      } as never);

      await updateCustomer('c1', {
        customerName: '수정된 고객사',
        customerAddress: '주소',
      });
      expect(httpClient.patch).toHaveBeenCalledWith('/customers/c1', {
        customerName: '수정된 고객사',
        customerAddress: '주소',
      });
    });
  });

  describe('activateCustomer', () => {
    it('PATCH /customers/:id/activate 호출', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'c1', isActive: true },
      } as never);

      await activateCustomer('c1');
      expect(httpClient.patch).toHaveBeenCalledWith('/customers/c1/activate');
    });
  });

  describe('deactivateCustomer', () => {
    it('PATCH /customers/:id/deactivate 호출', async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({
        data: { id: 'c1', isActive: false },
      } as never);

      await deactivateCustomer('c1');
      expect(httpClient.patch).toHaveBeenCalledWith('/customers/c1/deactivate');
    });
  });
});
