import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { BranchesModule } from './branches/branches.module';
import { KitchensModule } from './kitchens/kitchens.module';
import { MenusModule } from './menus/menus.module';
import { OptionsModule } from './options/options.module';
import { ZonesModule } from './zones/zones.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    BrandsModule, 
    BranchesModule,
    KitchensModule,
    MenusModule,
    OptionsModule,
    ZonesModule,
    TablesModule
  ],
})
export class AppModule {}
