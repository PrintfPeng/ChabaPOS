import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A2-2: Unified branch-access check.
 *
 * Accepts:
 *  - the brand OWNER (brand.userId === callerUserId)
 *  - any user who has a BranchUser record for the branch (CASHIER staff)
 *
 * Previously only the brand owner could pass — all CASHIER-role accounts were
 * permanently locked out. This helper fixes that while keeping the ownership
 * guarantee: callers can only operate branches they are explicitly assigned to.
 */
export async function assertBranchAccess(
  prisma: PrismaService,
  userId: number,
  branchId: number,
): Promise<void> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      brand:      { select: { userId: true } },
      staffUsers: { where: { userId }, select: { id: true } },
    },
  });
  if (!branch) throw new NotFoundException('ไม่พบสาขา');
  const isOwner = branch.brand.userId === userId;
  const isStaff = branch.staffUsers.length > 0;
  if (!isOwner && !isStaff) {
    throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
  }
}
