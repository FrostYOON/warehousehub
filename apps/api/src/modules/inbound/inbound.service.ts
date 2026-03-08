import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InboundUploadStatus, StorageType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { getModuleLogger } from '../../common/logging/module-logger';

type ParsedRow = {
  itemCode: string;
  itemName: string;
  storageType: StorageType;
  quantity: number;
  expiryDate: Date | null;
  unitCost: number | null;
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

function asNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

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

function normalizeHeaderName(name: string): string {
  return name.trim();
}

function normalizeRowKeys(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeaderName(key)] = value;
  }
  return normalized;
}

function normalizeToUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
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
    if (!s || s === '-' || s.toUpperCase() === 'N/A' || s === '없음')
      return null;

    // 2) Date 객체로 들어오는 케이스 (cellDates: true)
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime()))
        throw new Error(`Invalid expiryDate: ${raw.toISOString()}`);
      return normalizeToUtcDay(raw);
    }

    // 3) 숫자(엑셀 시리얼 날짜)로 들어오는 케이스
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      // Excel(1900) serial -> JS Date
      const js = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (Number.isNaN(js.getTime()))
        throw new Error(`Invalid expiryDate serial: ${raw}`);
      return normalizeToUtcDay(js);
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
      return normalizeToUtcDay(d);
    }

    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`Invalid expiryDate format: ${s}`);

    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid expiryDate: ${s}`);
    return normalizeToUtcDay(d);
  }

  private parseQuantity(raw: unknown): number {
    const n = Number(toCellString(raw).trim());
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`Invalid quantity: ${toCellString(raw)}`);
    }
    return n;
  }

  private parseUnitCost(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    const s = toCellString(raw).trim();
    if (!s || s === '-' || s.toUpperCase() === 'N/A') return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  private ensureRequiredColumns(headers: string[]) {
    const normalizedHeaders = headers.map(normalizeHeaderName);
    for (const col of REQUIRED_COLUMNS) {
      if (!normalizedHeaders.includes(col))
        throw new Error(`Missing column: ${col}`);
    }
  }

  private async parseExcel(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('No sheet found');

    const json: Record<string, unknown>[] = [];
    let headers: string[] = [];
    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as unknown[];
      if (rowNumber === 1) {
        headers = (values?.slice(1) ?? []).map((v) =>
          String(v ?? ''),
        ) as string[];
      } else {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h] = values?.[i + 1] ?? '';
        });
        json.push(obj);
      }
    });

    this.ensureRequiredColumns(headers);

    return json.map((rawRow, idx) => {
      const r = normalizeRowKeys(rawRow);
      let isValid = true;
      let errorMessage: string | null = null;

      const rowNo = idx + 2; // 1행=헤더 가정
      try {
        const itemCode = String(r['ItemCode']).trim();
        const itemName = String(r['ItemName']).trim();
        const storageType = this.parseStorageType(r['StorageType']);
        const quantity = this.parseQuantity(r['Quantity']);
        const expiryDate = this.parseExpiryDate(r['ExpiryDate']);
        const unitCost = this.parseUnitCost(r['UnitCost']);

        if (!itemCode) throw new Error('ItemCode is empty');
        if (!itemName) throw new Error('ItemName is empty');

        return {
          itemCode,
          itemName,
          storageType,
          quantity,
          expiryDate,
          unitCost,
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
          unitCost: null,
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
    const rows = await this.parseExcel(params.buffer);

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
            unitCost: r.unitCost,
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

  async getUpload(
    companyId: string,
    uploadId: string,
    query?: { rowPage?: number; rowPageSize?: number },
  ) {
    const rowPage = Math.max(1, query?.rowPage ?? 1);
    const rowPageSize = Math.max(1, Math.min(500, query?.rowPageSize ?? 50));
    const skip = (rowPage - 1) * rowPageSize;

    const upload = await this.prisma.inboundUpload.findFirst({
      where: { id: uploadId, companyId },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        confirmedAt: true,
      },
    });

    if (!upload) throw new NotFoundException('Upload not found');
    const [rows, rowTotal] = await Promise.all([
      this.prisma.inboundUploadRow.findMany({
        where: { uploadId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: rowPageSize,
      }),
      this.prisma.inboundUploadRow.count({ where: { uploadId } }),
    ]);

    const rowTotalPages = Math.max(1, Math.ceil(rowTotal / rowPageSize));
    return {
      ...upload,
      rows: rows.map((row) => ({
        ...row,
        quantity: asNumber(row.quantity),
      })),
      rowTotal,
      rowPage,
      rowPageSize,
      rowTotalPages,
    };
  }

  async listUploads(
    companyId: string,
    query?: {
      status?: InboundUploadStatus;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, query?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const keyword = query?.keyword?.trim();
    const where: Prisma.InboundUploadWhereInput = {
      companyId,
      status: query?.status,
      OR: keyword
        ? [
            { fileName: { contains: keyword, mode: 'insensitive' } },
            { id: { contains: keyword, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const uploads = await this.prisma.inboundUpload.findMany({
      where,
      include: {
        rows: {
          select: { isValid: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });
    const total = await this.prisma.inboundUpload.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const items = uploads.map((upload) => {
      const invalidCount = upload.rows.filter((row) => !row.isValid).length;
      return {
        id: upload.id,
        fileName: upload.fileName,
        status: upload.status,
        createdAt: upload.createdAt,
        confirmedAt: upload.confirmedAt,
        invalidCount,
        rowCount: upload.rows.length,
      };
    });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
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
    const invalidRows = upload.rows.filter((r) => !r.isValid);
    if (invalidRows.length > 0)
      throw new BadRequestException('Cannot confirm: invalid rows exist');

    // 트랜잭션 시작
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 동시 confirm 경쟁 상황에서 한 요청만 선점하도록 보장
      const claimed = await tx.inboundUpload.updateMany({
        where: {
          id: uploadId,
          companyId,
          status: 'UPLOADED',
        },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Upload already processed');
      }

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

      // 3️⃣ Warehouse 미리 조회 (type+region별, region='default' 우선)
      const warehouses = await tx.warehouse.findMany({
        where: { companyId },
        select: { id: true, type: true, region: true },
      });
      const warehouseByType = new Map<string, { id: string }>();
      for (const w of warehouses) {
        if (w.region === 'default' && !warehouseByType.has(w.type)) {
          warehouseByType.set(w.type, { id: w.id });
        }
      }
      for (const w of warehouses) {
        if (!warehouseByType.has(w.type)) {
          warehouseByType.set(w.type, { id: w.id });
        }
      }

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
          select: { id: true, unitCost: true },
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
          const normalizedExpiryDate = normalizeToUtcDay(row.expiryDate);
          const existingLot = await tx.lot.findFirst({
            where: {
              companyId,
              itemId: item.id,
              expiryDate: {
                gte: normalizedExpiryDate,
                lt: addUtcDays(normalizedExpiryDate, 1),
              },
            },
            select: { id: true },
          });
          if (existingLot) {
            lot = existingLot;
          } else {
            lot = await tx.lot.create({
              data: {
                companyId,
                itemId: item.id,
                expiryDate: normalizedExpiryDate,
              },
              select: { id: true },
            });
          }
        }

        // 3️⃣ Warehouse 조회 (캐시 사용)
        const warehouse = warehouseByType.get(row.storageType);
        if (!warehouse) {
          throw new BadRequestException(
            `Warehouse not found: ${row.storageType}`,
          );
        }

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

        // 5️⃣ InventoryTxLine 생성 (입고 시 원가 기록: 행 원가 ?? 품목 기본 원가)
        const unitCost =
          row.unitCost != null
            ? row.unitCost
            : item.unitCost != null
              ? asNumber(item.unitCost)
              : null;
        await tx.inventoryTxLine.create({
          data: {
            txId: inventoryTx.id,
            warehouseId: warehouse.id,
            lotId: lot.id,
            qtyDelta: row.quantity,
            unitCost,
          },
        });
      }

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

  async cancelUpload(params: { companyId: string; uploadId: string }) {
    const { companyId, uploadId } = params;

    const claimed = await this.prisma.inboundUpload.updateMany({
      where: {
        id: uploadId,
        companyId,
        status: 'UPLOADED',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (claimed.count !== 1) {
      throw new BadRequestException('Only UPLOADED upload can be cancelled');
    }

    logger.info({
      event: 'inbound.cancel.success',
      companyId,
      uploadId,
    });

    return { ok: true };
  }
}
