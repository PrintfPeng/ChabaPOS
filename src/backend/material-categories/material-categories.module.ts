import { Module } from '@nestjs/common';
import { MaterialCategoriesService } from './material-categories.service';
import { MaterialCategoriesController } from './material-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MaterialCategoriesController],
  providers: [MaterialCategoriesService],
  exports: [MaterialCategoriesService],
})
export class MaterialCategoriesModule {}
