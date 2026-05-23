import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request, Query, Inject } from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto, UpdateRawMaterialDto } from './dto/raw-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('raw-materials')
export class RawMaterialsController {
  constructor(@Inject(RawMaterialsService) private readonly rawMaterialsService: RawMaterialsService) {}

  @Post()
  create(@Request() req, @Body() createRawMaterialDto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(req.user.userId, createRawMaterialDto);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.rawMaterialsService.findAll(req.user.userId, branchId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateRawMaterialDto: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(req.user.userId, id, updateRawMaterialDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.rawMaterialsService.remove(req.user.userId, id);
  }
}
