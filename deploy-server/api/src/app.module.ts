import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { RefuelsModule } from './refuels/refuels.module';
import { StatsModule } from './stats/stats.module';
import { OcrModule } from './ocr/ocr.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { InsuranceModule } from './insurance/insurance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    VehiclesModule,
    RefuelsModule,
    StatsModule,
    OcrModule,
    MaintenanceModule,
    InsuranceModule,
  ],
})
export class AppModule {}
