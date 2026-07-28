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
import { SuppliersModule } from './suppliers/suppliers.module';
import { MaterialCategoriesModule } from './material-categories/material-categories.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { CustomersModule } from './customers/customers.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PlansModule } from './plans/plans.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SettingsModule } from './settings/settings.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';

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
    DashboardModule,
    SuppliersModule,
    MaterialCategoriesModule,
    RawMaterialsModule,
    PurchaseOrdersModule,
    CustomersModule,
    PromotionsModule,
    PlansModule,
    SuperAdminModule,
    SettingsModule,
    BillingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
