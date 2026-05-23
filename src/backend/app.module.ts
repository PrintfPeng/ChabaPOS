import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { BranchesModule } from './branches/branches.module';
import { KitchensModule } from './kitchens/kitchens.module';
import { MenusModule } from './menus/menus.module';
import { OptionsModule } from './options/options.module';
import { ZonesModule } from './zones/zones.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
    TablesModule,
    OrdersModule,
    DashboardModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
