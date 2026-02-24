import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { getModuleLogger } from '../../common/logging/module-logger';

type ParsedRow = {
  itemCode: string;
  itemName: string;
  storageType: StorageType;
  quantity: number;
  expiryDate: Date | null;
  isValid: boolean;
  errorMessage: string | null;
};

const REQUIRED_COLUMNS = [
  'ItemCode',
  'ItemName',
  'StorageType',
  'Quantity',
  'ExpiryDate',
] as const;

const logger = getModuleLogger('InboundService');

function toCellString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (
    typeof raw === 'number' ||
    typeof raw === 'boolean' ||
    typeof raw === 'bigint'
  ) {
    return String(raw);
  }
  if (raw instanceof Date) return raw.toISOString();
  return '';
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid row';
}

@Injectable()
export class InboundService {
  constructor(private readonly prisma: PrismaService) {}

  private parseStorageType(raw: unknown): StorageType {
    const v = toCellString(raw).trim().toUpperCase();
    if (v === 'DRY') return StorageType.DRY;
    if (v === 'COOL') return StorageType.COOL;
    if (v === 'FRZ') return StorageType.FRZ;
    throw new Error(`Invalid StorageType: ${v}`);
  }

  private parseExpiryDate(raw: unknown): Date | null {
    if (raw === null || raw === undefined) return null;

    // 1) "-" / 빈값 처리
    const s = toCellString(raw).trim();
    if (!s || s === '-') return null;

    // 2) Date 객체로 들어오는 케이스 (cellDates: true)
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime()))
        throw new Error(`Invalid expiryDate: ${raw.toISOString()}`);
      // 날짜만 쓰고 싶으면 UTC 00:00으로 정규화(선택)
      return new Date(
        Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()),
      );
    }

    // 3) 숫자(엑셀 시리얼 날짜)로 들어오는 케이스
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      // Excel(1900) serial -> JS Date
      const js = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (Number.isNaN(js.getTime()))
        throw new Error(`Invalid expiryDate serial: ${raw}`);
      return new Date(
        Date.UTC(js.getUTCFullYear(), js.getUTCMonth(), js.getUTCDate()),
      );
    }

    // 4) 문자열: YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD / YY.MM.DD 등 허용
    const normalized = s.replace(/\./g, '-').replace(/\//g, '-');
    // YY-MM-DD -> 20YY로 가정(필요하면 규칙 변경)
    const m2 = normalized.match(/^(\d{2})-(\d{2})-(\d{2})$/);
    if (m2) {
      const yyyy = `20${m2[1]}`;
      const mm = m2[2];
      const dd = m2[3];
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime()))
        throw new Error(`Invalid expiryDate: ${s}`);
      return d;
    }

    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`Invalid expiryDate format: ${s}`);

    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid expiryDate: ${s}`);
    return d;
  }

  private parseQuantity(raw: unknown): number {
    const n = Number(toCellString(raw).trim());
    if (!Number.isFinite(n) || n <= 0)
      throw new Error(`Invalid quantity: ${toCellString(raw)}`);
    return Math.floor(n);
  }

  private ensureRequiredColumns(headers: string[]) {
    for (const col of REQUIRED_COLUMNS) {
      if (!headers.includes(col)) throw new Error(`Missing column: ${col}`);
    }
  }

  private parseExcel(buffer: Buffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('No sheet found');

    const sheet = wb.Sheets[sheetName];
    const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: true,
    });

    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    this.ensureRequiredColumns(headers);

    return json.map((r, idx) => {
      let isValid = true;
      let errorMessage: string | null = null;

      const rowNo = idx + 2; // 1행=헤더 가정
      try {
        const itemCode = String(r['ItemCode']).trim();
        const itemName = String(r['ItemName']).trim();
        const storageType = this.parseStorageType(r['StorageType']);
        const quantity = this.parseQuantity(r['Quantity']);
        const expiryDate = this.parseExpiryDate(r['ExpiryDate']);

        if (!itemCode) throw new Error('ItemCode is empty');
        if (!itemName) throw new Error('ItemName is empty');

        return {
          itemCode,
          itemName,
          storageType,
          quantity,
          expiryDate,
          isValid,
          errorMessage,
        };
      } catch (e: unknown) {
        isValid = false;
        errorMessage = `Row ${rowNo}: ${errorMessageOf(e)}`;
        return {
          itemCode: toCellString(r['ItemCode']).trim(),
          itemName: toCellString(r['ItemName']).trim(),
          storageType: StorageType.DRY, // 임시값(유효하지 않으면 무시됨)
          quantity: 0,
          expiryDate: null,
          isValid,
          errorMessage,
        };
      }
    });
  }

  async createUpload(params: {
    companyId: string;
    userId: string;
    fileName: string;
    buffer: Buffer;
  }) {
    const rows = this.parseExcel(params.buffer);

    const upload = await this.prisma.inboundUpload.create({
      data: {
        companyId: params.companyId,
        uploadedByUserId: params.userId,
        fileName: params.fileName,
        status: 'UPLOADED',
        rows: {
          create: rows.map((r) => ({
            itemCode: r.itemCode,
            itemName: r.itemName,
            storageType: r.storageType,
            quantity: r.quantity,
            expiryDate: r.expiryDate,
            isValid: r.isValid,
            errorMessage: r.errorMessage,
          })),
        },
      },
      select: { id: true },
    });

    return {
      id: upload.id,
      invalidCount: rows.filter((r) => !r.isValid).length,
    };
  }

  async getUpload(companyId: string, uploadId: string) {
    const upload = await this.prisma.inboundUpload.findFirst({
      where: { id: uploadId, companyId },
      include: { rows: { orderBy: { createdAt: 'asc' } } },
    });

    if (!upload) throw new NotFoundException('Upload not found');
    return upload;
  }

  async confirmUpload(params: {
    companyId: string;
    uploadId: string;
    actorUserId: string;
  }) {
    const { companyId, uploadId, actorUserId } = params;
    logger.info({
      event: 'inbound.confirm.start',
      companyId,
      uploadId,
      actorUserId,
    });

    const upload = await this.prisma.inboundUpload.findFirst({
      where: { id: uploadId, companyId },
      include: { rows: true },
    });

    if (!upload) throw new NotFoundException('Upload not found');
    if (upload.status !== 'UPLOADED')
      throw new BadRequestException('Upload already processed');

    const invalidRows = upload.rows.filter((r) => !r.isValid);
    if (invalidRows.length > 0)
      throw new BadRequestException('Cannot confirm: invalid rows exist');

    // 트랜잭션 시작
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // InventoryTx 생성
      const inventoryTx = await tx.inventoryTx.create({
        data: {
          companyId,
          type: 'INBOUND_CONFIRM',
          actorUserId,
          refType: 'InboundUpload',
          refId: uploadId,
        },
      });

      for (const row of upload.rows) {
        // 1️⃣ Item upsert
        const item = await tx.item.upsert({
          where: {
            companyId_itemCode: {
              companyId,
              itemCode: row.itemCode,
            },
          },
          update: { itemName: row.itemName },
          create: {
            companyId,
            itemCode: row.itemCode,
            itemName: row.itemName,
          },
          select: { id: true },
        });

        // 2️⃣ Lot get or create (null 처리 포함)
        let lot: { id: string };

        if (row.expiryDate === null) {
          const existingLot = await tx.lot.findFirst({
            where: {
              companyId,
              itemId: item.id,
              expiryDate: null,
            },
            select: { id: true },
          });

          if (!existingLot) {
            lot = await tx.lot.create({
              data: {
                companyId,
                itemId: item.id,
                expiryDate: null,
              },
              select: { id: true },
            });
          } else {
            lot = existingLot;
          }
        } else {
          lot = await tx.lot.upsert({
            where: {
              companyId_itemId_expiryDate: {
                companyId,
                itemId: item.id,
                expiryDate: row.expiryDate,
              },
            },
            update: {},
            create: {
              companyId,
              itemId: item.id,
              expiryDate: row.expiryDate,
            },
            select: { id: true },
          });
        }

        // 3️⃣ Warehouse 찾기
        const warehouse = await tx.warehouse.findFirst({
          where: {
            companyId,
            type: row.storageType,
          },
          select: { id: true },
        });

        if (!warehouse)
          throw new Error(`Warehouse not found: ${row.storageType}`);

        // 4️⃣ Stock upsert (+onHand)
        await tx.stock.upsert({
          where: {
            companyId_warehouseId_lotId: {
              companyId,
              warehouseId: warehouse.id,
              lotId: lot.id,
            },
          },
          update: {
            onHand: { increment: row.quantity },
          },
          create: {
            companyId,
            warehouseId: warehouse.id,
            lotId: lot.id,
            onHand: row.quantity,
          },
        });

        // 5️⃣ InventoryTxLine 생성
        await tx.inventoryTxLine.create({
          data: {
            txId: inventoryTx.id,
            warehouseId: warehouse.id,
            lotId: lot.id,
            qtyDelta: row.quantity,
          },
        });
      }

      // 6️⃣ Upload 상태 변경
      await tx.inboundUpload.update({
        where: { id: uploadId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      logger.info({
        event: 'inbound.confirm.success',
        companyId,
        uploadId,
        actorUserId,
        rowCount: upload.rows.length,
      });
      return { ok: true };
    });
  }
}
