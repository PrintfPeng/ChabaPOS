import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request, Query, Inject } from '@nestjs/common';
import { MaterialCategoriesService } from './material-categories.service';
import { CreateMaterialCategoryDto, UpdateMaterialCategoryDto } from './dto/material-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { validateBody } from '../common/validate-body';

@UseGuards(JwtAuthGuard)
@Controller('material-categories')
export class MaterialCategoriesController {
  constructor(@Inject(MaterialCategoriesService) private readonly materialCategoriesService: MaterialCategoriesService) {}

  @Post()
  create(@Request() req, @Body(validateBody(CreateMaterialCategoryDto)) createMaterialCategoryDto: CreateMaterialCategoryDto) {
    return this.materialCategoriesService.create(req.user.userId, createMaterialCategoryDto);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.materialCategoriesService.findAll(req.user.userId, branchId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateMaterialCategoryDto)) updateMaterialCategoryDto: UpdateMaterialCategoryDto) {
    return this.materialCategoriesService.update(req.user.userId, id, updateMaterialCategoryDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.materialCategoriesService.remove(req.user.userId, id);
  }
}
