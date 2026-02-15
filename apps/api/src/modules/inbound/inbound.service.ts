import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';
import * as XLSX from 'xlsx';

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

@Injectable()
export class InboundService {
  constructor(private readonly prisma: PrismaService) {}

  private parseStorageType(raw: unknown): StorageType {
    const v = String(raw ?? '')
      .trim()
      .toUpperCase();
    if (v === 'DRY') return StorageType.DRY;
    if (v === 'COOL') return StorageType.COOL;
    if (v === 'FRZ') return StorageType.FRZ;
    throw new Error(`Invalid StorageType: ${v}`);
  }

  private parseExpiryDate(raw: unknown): Date | null {
    const v = String(raw ?? '').trim();
    if (!v || v === '-') return null;

    // 기대 포맷: YYYY-MM-DD
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`Invalid expiryDate format: ${v}`);

    const [_, y, mo, d] = m;
    const date = new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new Error(`Invalid expiryDate: ${v}`);
    return date;
  }

  private parseQuantity(raw: unknown): number {
    const n = Number(String(raw ?? '').trim());
    if (!Number.isFinite(n) || n <= 0)
      throw new Error(`Invalid quantity: ${raw}`);
    return Math.floor(n);
  }

  private ensureRequiredColumns(headers: string[]) {
    for (const col of REQUIRED_COLUMNS) {
      if (!headers.includes(col)) throw new Error(`Missing column: ${col}`);
    }
  }

  private parseExcel(buffer: Buffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('No sheet found');

    const sheet = wb.Sheets[sheetName];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
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
      } catch (e: any) {
        isValid = false;
        errorMessage = `Row ${rowNo}: ${e.message ?? 'Invalid row'}`;
        return {
          itemCode: String(r['ItemCode'] ?? '').trim(),
          itemName: String(r['ItemName'] ?? '').trim(),
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
}
