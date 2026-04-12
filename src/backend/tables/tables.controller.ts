import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('tables')
export class TablesController {
  constructor(@Inject(TablesService) private readonly tablesService: TablesService) {}

  @Post()
  create(@Request() req, @Body() body: CreateTableDto) {
    return this.tablesService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Request() req, @Query('zoneId', ParseIntPipe) zoneId: number) {
    return this.tablesService.findAll(req.user.userId, zoneId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.tablesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateTableDto) {
    return this.tablesService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.tablesService.remove(req.user.userId, id);
  }

  @Get(':id/qrcode')
  async getQRCode(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const qrCode = await this.tablesService.generateQRCode(req.user.userId, id);
    return { qrCode };
  }

  @Public()
  @Get('by-qrcode/:qrCode')
  getByQrCode(@Param('qrCode') qrCode: string) {
    return this.tablesService.findByQrCode(qrCode);
  }
}
