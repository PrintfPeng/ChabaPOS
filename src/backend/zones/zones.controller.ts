import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('zones')
export class ZonesController {
  constructor(@Inject(ZonesService) private readonly zonesService: ZonesService) {}

  @Post()
  create(@Request() req, @Body() body: CreateZoneDto) {
    return this.zonesService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.zonesService.findAll(req.user.userId, branchId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateZoneDto) {
    return this.zonesService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.zonesService.remove(req.user.userId, id);
  }
}
