import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BranchesService } from '../branches/branches.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('brands')
export class BrandsController {
  constructor(
    @Inject(BrandsService) private readonly brandsService: BrandsService,
    @Inject(BranchesService) private readonly branchesService: BranchesService,
  ) {}

  @Post()
  create(@Request() req, @Body() body: CreateBrandDto) {
    return this.brandsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Request() req) {
    return this.brandsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOne(req.user.userId, id);
  }

  @Get(':id/branches')
  findBranches(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.branchesService.findByBrand(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateBrandDto) {
    return this.brandsService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.brandsService.remove(req.user.userId, id);
  }
}
