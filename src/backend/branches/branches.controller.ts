import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { validateBody } from '../common/validate-body';

@Controller('branches')
export class BranchesController {
  constructor(@Inject(BranchesService) private readonly branchesService: BranchesService) {}

  @Post()
  create(@Request() req, @Body(validateBody(CreateBranchDto)) body: CreateBranchDto) {
    return this.branchesService.create(req.user.userId, body);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateBranchDto)) body: UpdateBranchDto) {
    return this.branchesService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.branchesService.remove(req.user.userId, id);
  }

  @Public()
  @Get(':id/menu')
  getMenu(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.getMenu(id);
  }

  @Public()
  @Get(':id/tables')
  getTables(@Param('id', ParseIntPipe) id: number) {
    return this.branchesService.getTables(id);
  }

  @Post(':id/verify-pin')
  verifyPin(@Request() req, @Param('id', ParseIntPipe) id: number, @Body('pin') pin: string) {
    return this.branchesService.verifyPin(req.user.userId, id, pin);
  }
}
