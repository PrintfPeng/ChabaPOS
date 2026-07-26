import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TableAccessService } from './table-access.service';

@Module({
  imports: [PrismaModule],
  providers: [TableAccessService],
  exports: [TableAccessService],
})
export class CommonModule {}
