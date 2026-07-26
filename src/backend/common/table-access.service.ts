import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TableContext {
  tableId: number;
  branchId: number;
}

/**
 * Turns the QR code printed on a table into the branch and table it belongs to.
 *
 * `Table.qrCode` is a unique UUID that only ever appears on the sticker at the
 * table, so possessing it stands in for "this request came from someone sitting
 * in the shop". Customer-facing endpoints resolve the branch through here
 * instead of trusting a branchId sent by the browser, which keeps every such
 * request pinned to the single branch whose code was actually scanned.
 */
@Injectable()
export class TableAccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolve(qrCode: string): Promise<TableContext> {
    const table = await this.prisma.table.findUnique({
      where: { qrCode },
      select: { id: true, zone: { select: { branchId: true } } },
    });

    if (!table) {
      throw new NotFoundException('ไม่พบโต๊ะนี้ กรุณาสแกน QR ใหม่อีกครั้ง');
    }

    return { tableId: table.id, branchId: table.zone.branchId };
  }
}
