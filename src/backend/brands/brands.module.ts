import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { BranchesService } from '../branches/branches.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BranchesService],
})
export class BrandsModule {}
