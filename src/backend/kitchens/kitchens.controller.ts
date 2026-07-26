import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query, Patch } from '@nestjs/common';
import { KitchensService } from './kitchens.service';
import { CreateKitchenDto } from './dto/create-kitchen.dto';
import { UpdateKitchenDto } from './dto/update-kitchen.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { validateBody } from '../common/validate-body';

@Controller('kitchens')
export class KitchensController {
  constructor(@Inject(KitchensService) private readonly kitchensService: KitchensService) {}

  @Post()
  create(@Request() req, @Body(validateBody(CreateKitchenDto)) body: CreateKitchenDto) {
    return this.kitchensService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.kitchensService.findAll(req.user.userId, branchId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateKitchenDto)) body: UpdateKitchenDto) {
    return this.kitchensService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.kitchensService.remove(req.user.userId, id);
  }
}
