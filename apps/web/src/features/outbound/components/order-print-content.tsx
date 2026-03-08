'use client';

import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import type { OutboundOrder } from '../model/types';

type OrderPrintContentProps = {
  order: OutboundOrder;
  outboundDisplayNo: string;
};

export function OrderPrintContent({ order, outboundDisplayNo }: OrderPrintContentProps) {
  const customerName = order.customer?.name ?? order.customer?.customerName ?? '-';
  const addressParts = [
    order.customer.customerAddress,
    order.customer.city,
    order.customer.state,
    order.customer.postalCode,
    order.customer.country,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '-';

  return (
    <div className="order-print-content mx-auto max-w-[800px] bg-white p-6 text-slate-800 print:p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">출고 주문서</h1>
        <p className="mt-2 text-sm text-slate-600">
          {outboundDisplayNo} · {new Date(order.plannedDate).toLocaleDateString('ko-KR')}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-slate-500">출고번호</p>
          <p className="font-semibold">{outboundDisplayNo}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">상태</p>
          <p className="font-semibold">{order.status}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">고객사</p>
          <p className="font-semibold">{customerName}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">출고예정일</p>
          <p className="font-semibold">
            {new Date(order.plannedDate).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <div className="col-span-2">
          <p className="font-medium text-slate-500">배송 주소</p>
          <p className="font-semibold">{fullAddress}</p>
        </div>
        {order.memo && (
          <div className="col-span-2">
            <p className="font-medium text-slate-500">메모</p>
            <p className="font-semibold">{order.memo}</p>
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold text-slate-700">품목코드</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">품목명</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">요청수량</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">픽수량</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">배송수량</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">완료수량</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-700">상태</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-100">
              <td className="px-3 py-2">{line.item?.itemCode ?? '-'}</td>
              <td className="px-3 py-2">{line.item?.itemName ?? '-'}</td>
              <td className="px-3 py-2 text-right">
                {formatDecimalForDisplay(line.requestedQty)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatDecimalForDisplay(line.pickedQty)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatDecimalForDisplay(line.shippedQty)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatDecimalForDisplay(line.deliveredQty)}
              </td>
              <td className="px-3 py-2 text-center">{line.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-xs text-slate-500">
        출력일시: {new Date().toLocaleString('ko-KR')} · WarehouseHub
      </p>
    </div>
  );
}
