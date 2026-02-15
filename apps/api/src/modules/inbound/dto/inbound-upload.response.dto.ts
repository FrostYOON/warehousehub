import { ApiProperty } from '@nestjs/swagger';
import { InboundUploadStatus, StorageType } from '@prisma/client';

export class InboundUploadRowResponse {
  @ApiProperty() id!: string;
  @ApiProperty() itemCode!: string;
  @ApiProperty() itemName!: string;
  @ApiProperty({ enum: StorageType }) storageType!: StorageType;
  @ApiProperty() quantity!: number;
  @ApiProperty({ nullable: true, description: 'null이면 유통기한 없음' })
  expiryDate!: string | null;
  @ApiProperty() isValid!: boolean;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
}

export class InboundUploadResponse {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty({ enum: InboundUploadStatus }) status!: InboundUploadStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true }) confirmedAt!: string | null;
  @ApiProperty({ type: [InboundUploadRowResponse] })
  rows!: InboundUploadRowResponse[];
}
