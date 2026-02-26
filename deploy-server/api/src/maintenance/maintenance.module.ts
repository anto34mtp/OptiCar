import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [VehiclesModule, OcrModule],
  providers: [MaintenanceService],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
