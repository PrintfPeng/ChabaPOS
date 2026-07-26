import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }
}
