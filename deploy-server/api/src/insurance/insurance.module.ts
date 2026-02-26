import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  providers: [InsuranceService],
  controllers: [InsuranceController],
  exports: [InsuranceService],
})
export class InsuranceModule {}
