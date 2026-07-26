import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlansService, RolesGuard, Reflector],
})
export class PlansModule {}
