import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

export enum PickReserveMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

class PickReserveAllocationDto {
  @ApiProperty()
  @IsUUID()
  outboundLineId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiProperty({ enum: PickReserveMode })
  @IsEnum(PickReserveMode)
  mode!: PickReserveMode;

  // AUTO 모드에서 필요 (DRY/COOL/FRZ)
  @ApiPropertyOptional({ enum: StorageType })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  // MANUAL 모드에서 필요
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lotId?: string;
}

export class PickReserveDto {
  @ApiProperty({ type: [PickReserveAllocationDto] })
  @ValidateNested({ each: true })
  @Type(() => PickReserveAllocationDto)
  allocations!: PickReserveAllocationDto[];
}
