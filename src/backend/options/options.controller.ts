import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Inject, Query } from '@nestjs/common';
import { OptionsService } from './options.service';
import { CreateOptionGroupDto, CreateOptionDto } from './dto/option.dto';
import { UpdateOptionGroupDto, UpdateOptionDto } from './dto/update-option.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('options')
@UseGuards(JwtAuthGuard)
export class OptionsController {
  constructor(@Inject(OptionsService) private readonly optionsService: OptionsService) {}

  @Post('groups')
  createGroup(@Request() req, @Body() body: CreateOptionGroupDto) {
    return this.optionsService.createGroup(req.user.userId, body);
  }

  @Get()
  findAllGroups(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.optionsService.findAllGroups(req.user.userId, branchId);
  }

  @Patch('groups/:id')
  updateGroup(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateOptionGroupDto) {
    return this.optionsService.updateGroup(req.user.userId, id, body);
  }

  @Delete('groups/:id')
  removeGroup(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.optionsService.removeGroup(req.user.userId, id);
  }

  @Post()
  createOption(@Request() req, @Body() body: CreateOptionDto) {
    return this.optionsService.createOption(req.user.userId, body);
  }

  @Patch(':id')
  updateOption(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateOptionDto) {
    return this.optionsService.updateOption(req.user.userId, id, body);
  }

  @Delete(':id')
  removeOption(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.optionsService.removeOption(req.user.userId, id);
  }
}
