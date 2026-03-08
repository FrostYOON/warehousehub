'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { OrderPrintContent } from './order-print-content';
import type { OutboundOrder } from '../model/types';

type OrderPrintPdfButtonsProps = {
  order: OutboundOrder;
  outboundDisplayNo: string;
  onPdfStart?: () => void;
  onPdfDone?: () => void;
  onPdfError?: (err: unknown) => void;
};

export function OrderPrintPdfButtons({
  order,
  outboundDisplayNo,
  onPdfStart,
  onPdfDone,
  onPdfError,
}: OrderPrintPdfButtonsProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `출고주문서_${outboundDisplayNo}`,
    pageStyle: `
      @page { margin: 15mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  const handleDownloadPdf = () => {
    try {
      onPdfStart?.();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const customerName = order.customer?.name ?? order.customer?.customerName ?? '-';
      const addressParts = [
        order.customer.customerAddress,
        order.customer.city,
        order.customer.state,
        order.customer.postalCode,
        order.customer.country,
      ].filter(Boolean);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '-';

      doc.setFontSize(18);
      doc.text('출고 주문서', 14, 20);
      doc.setFontSize(10);
      doc.text(`${outboundDisplayNo} · ${new Date(order.plannedDate).toLocaleDateString('ko-KR')}`, 14, 28);

      doc.setFontSize(9);
      doc.text(`출고번호: ${outboundDisplayNo}`, 14, 38);
      doc.text(`상태: ${order.status}`, 14, 44);
      doc.text(`고객사: ${customerName}`, 14, 50);
      doc.text(`출고예정일: ${new Date(order.plannedDate).toLocaleDateString('ko-KR')}`, 14, 56);
      doc.text(`배송 주소: ${fullAddress}`, 14, 62);
      if (order.memo) {
        doc.text(`메모: ${order.memo}`, 14, 68);
      }

      const tableStartY = order.memo ? 78 : 72;
      autoTable(doc, {
        startY: tableStartY,
        head: [['품목코드', '품목명', '요청수량', '픽수량', '배송수량', '완료수량', '상태']],
        body: order.lines.map((line) => [
          line.item?.itemCode ?? '-',
          line.item?.itemName ?? '-',
          formatDecimalForDisplay(line.requestedQty),
          formatDecimalForDisplay(line.pickedQty),
          formatDecimalForDisplay(line.shippedQty),
          formatDecimalForDisplay(line.deliveredQty),
          line.status,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [148, 163, 184], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableStartY;
      doc.setFontSize(7);
      doc.text(`출력일시: ${new Date().toLocaleString('ko-KR')} · WarehouseHub`, 14, finalY + 10);

      doc.save(`출고주문서_${outboundDisplayNo}.pdf`);
      onPdfDone?.();
    } catch (err) {
      onPdfError?.(err);
      throw err;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handlePrint()}
          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          인쇄
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          PDF 다운로드
        </button>
      </div>
      <div className="absolute left-[-9999px] top-0" aria-hidden="true">
        <div ref={printRef}>
          <OrderPrintContent order={order} outboundDisplayNo={outboundDisplayNo} />
        </div>
      </div>
    </>
  );
}
