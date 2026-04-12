import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query } from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateCategoryDto, CreateMenuItemDto } from './dto/menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('menus')
export class MenusController {
  constructor(@Inject(MenusService) private readonly menusService: MenusService) {}

  @Post('categories')
  createCategory(@Request() req, @Body() body: CreateCategoryDto) {
    return this.menusService.createCategory(req.user.userId, body);
  }

  @Get('categories')
  findAllCategories(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.menusService.findAllCategories(req.user.userId, branchId);
  }

  @Patch('categories/:id')
  updateCategory(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto) {
    return this.menusService.updateCategory(req.user.userId, id, body);
  }

  @Delete('categories/:id')
  removeCategory(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.menusService.removeCategory(req.user.userId, id);
  }

  @Post('items')
  createMenuItem(@Request() req, @Body() body: CreateMenuItemDto) {
    return this.menusService.createMenuItem(req.user.userId, body);
  }

  @Get('items')
  findAllMenuItems(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.menusService.findAllMenuItems(req.user.userId, branchId);
  }

  @Patch('items/:id')
  updateMenuItem(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateMenuItemDto) {
    return this.menusService.updateMenuItem(req.user.userId, id, body);
  }

  @Delete('items/:id')
  removeMenuItem(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.menusService.removeMenuItem(req.user.userId, id);
  }
}
