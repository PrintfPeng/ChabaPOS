import {
  Controller, Get, Post, Body, Param, Request, ParseIntPipe, Inject,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Controller('branches/:branchId/shifts')
export class ShiftsController {
  constructor(@Inject(ShiftsService) private readonly shiftsService: ShiftsService) {}

  /** GET /api/branches/:branchId/shifts/current */
  @Get('current')
  getCurrent(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.shiftsService.getCurrentShift(branchId);
  }

  /** POST /api/branches/:branchId/shifts/open */
  @Post('open')
  open(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Request() req: any,
    @Body() dto: OpenShiftDto,
  ) {
    return this.shiftsService.openShift(branchId, req.user.userId, dto);
  }

  /** POST /api/branches/:branchId/shifts/close */
  @Post('close')
  close(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Request() req: any,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeShift(branchId, req.user.userId, dto);
  }

  /** GET /api/branches/:branchId/shifts/:shiftId/summary */
  @Get(':shiftId/summary')
  getSummary(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('shiftId') shiftId: string,
  ) {
    return this.shiftsService.getShiftSummary(branchId, shiftId);
  }
}
