import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query } from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateCategoryDto, CreateMenuItemDto, CreateDeliveryPlatformDto, BulkDeliveryStatusDto } from './dto/menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto, UpdateDeliveryPlatformDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { validateBody } from '../common/validate-body';

@Controller('menus')
export class MenusController {
  constructor(@Inject(MenusService) private readonly menusService: MenusService) {}

  @Post('categories')
  createCategory(@Request() req, @Body(validateBody(CreateCategoryDto)) body: CreateCategoryDto) {
    return this.menusService.createCategory(req.user.userId, body);
  }

  @Get('categories')
  findAllCategories(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.menusService.findAllCategories(req.user.userId, branchId);
  }

  @Patch('categories/:id')
  updateCategory(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateCategoryDto)) body: UpdateCategoryDto) {
    return this.menusService.updateCategory(req.user.userId, id, body);
  }

  @Delete('categories/:id')
  removeCategory(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.menusService.removeCategory(req.user.userId, id);
  }

  // Delivery Platforms
  @Post('delivery-platforms')
  createDeliveryPlatform(@Request() req, @Body(validateBody(CreateDeliveryPlatformDto)) body: CreateDeliveryPlatformDto) {
    return this.menusService.createDeliveryPlatform(req.user.userId, body);
  }

  @Get('delivery-platforms')
  findAllDeliveryPlatforms(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.menusService.findAllDeliveryPlatforms(req.user.userId, branchId);
  }

  @Patch('delivery-platforms/:id')
  updateDeliveryPlatform(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateDeliveryPlatformDto)) body: UpdateDeliveryPlatformDto) {
    return this.menusService.updateDeliveryPlatform(req.user.userId, id, body);
  }

  @Delete('delivery-platforms/:id')
  removeDeliveryPlatform(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.menusService.removeDeliveryPlatform(req.user.userId, id);
  }

  @Patch('bulk-delivery-status')
  bulkUpdateDeliveryStatus(@Request() req, @Body(validateBody(BulkDeliveryStatusDto)) body: BulkDeliveryStatusDto) {
    return this.menusService.bulkUpdateDeliveryStatus(req.user.userId, body.branchId, body.enabledIds);
  }

  @Post('items')
  createMenuItem(@Request() req, @Body(validateBody(CreateMenuItemDto)) body: CreateMenuItemDto) {
    return this.menusService.createMenuItem(req.user.userId, body);
  }

  @Get('items')
  findAllMenuItems(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.menusService.findAllMenuItems(req.user.userId, branchId);
  }

  @Patch('items/:id')
  updateMenuItem(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdateMenuItemDto)) body: UpdateMenuItemDto) {
    return this.menusService.updateMenuItem(req.user.userId, id, body);
  }

  @Delete('items/:id')
  removeMenuItem(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.menusService.removeMenuItem(req.user.userId, id);
  }
}

