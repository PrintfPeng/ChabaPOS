import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, Inject, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { Public } from '../auth/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { validateBody } from '../common/validate-body';

@Controller('plans')
export class PlansController {
  constructor(@Inject(PlansService) private readonly plansService: PlansService) {}

  @Public()
  @Get('active')
  findActive() {
    return this.plansService.findActive();
  }

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body(validateBody(CreatePlanDto)) dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdatePlanDto)) dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.remove(id);
  }
}
