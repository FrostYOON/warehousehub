import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserBranchAccessService } from './user-branch-access.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserBranchAccessService],
  exports: [UsersService, UserBranchAccessService],
})
export class UsersModule {}
