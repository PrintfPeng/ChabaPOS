import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getSettings() {
    return this.prisma.platformSetting.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  updateSettings(dto: UpdateSettingsDto) {
    return this.prisma.platformSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...dto },
      update: dto,
    });
  }
}
