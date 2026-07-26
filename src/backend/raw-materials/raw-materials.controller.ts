import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
  Inject,
} from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto, UpdateRawMaterialDto, UpdateStockDto } from './dto/raw-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { validateBody } from '../common/validate-body';

@UseGuards(JwtAuthGuard)
@Controller('raw-materials')
export class RawMaterialsController {
  constructor(@Inject(RawMaterialsService) private readonly rawMaterialsService: RawMaterialsService) {}

  @Post()
  create(@Request() req, @Body(validateBody(CreateRawMaterialDto)) dto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.rawMaterialsService.findAll(req.user.userId, branchId);
  }

  @Patch(':id/stock')
  updateStock(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdateStockDto)) dto: UpdateStockDto,
  ) {
    return this.rawMaterialsService.updateStock(req.user.userId, id, dto);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdateRawMaterialDto)) dto: UpdateRawMaterialDto,
  ) {
    return this.rawMaterialsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.rawMaterialsService.remove(req.user.userId, id);
  }
}
