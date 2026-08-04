import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [PrismaModule, CommonModule, PromotionsModule, ShiftsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
